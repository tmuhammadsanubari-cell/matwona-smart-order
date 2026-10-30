import { ErrorCode } from 'shared';
import type { AuthUser, StaffOrderDto } from 'shared';
import type { Namespace } from 'socket.io';
import { AppException } from '../../common/app.exception.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TablesService } from '../tables/tables.service.js';
import { readCookie, RealtimeAuthService } from './realtime-auth.service.js';
import { RealtimeService } from './realtime.service.js';

const KASIR: AuthUser = { id: 'u1', outletId: 'outlet-1', name: 'Kasir', email: 'k@x', role: 'CASHIER' };
const CODE = 'MTW-261105-0001';

function authSetup() {
  const auth = { verifyAccessToken: vi.fn().mockResolvedValue(KASIR) };
  const tables = {
    resolveToken: vi.fn().mockResolvedValue({ table: { id: 'table-1', label: 'A3' }, outlet: { id: 'outlet-1' } }),
  };
  const prisma = { order: { findFirst: vi.fn().mockResolvedValue({ id: 'order-1' }) } };
  const service = new RealtimeAuthService(
    auth as unknown as AuthService,
    tables as unknown as TablesService,
    prisma as unknown as PrismaService,
  );
  return { auth, tables, prisma, service };
}

async function codeOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  return (error as AppException).code;
}

describe('RealtimeAuthService — handshake (PRD 2.2.4, 2.2.5)', () => {
  it('readCookie membaca cookie dari header handshake', () => {
    expect(readCookie('a=1; mtw_access=abc%3D; b=2', 'mtw_access')).toBe('abc=');
    expect(readCookie(undefined, 'mtw_access')).toBeUndefined();
    expect(readCookie('mtw_accessx=1', 'mtw_access')).toBeUndefined();
  });

  it('staf dengan cookie access → room kasir outletnya', async () => {
    const { service, auth } = authSetup();
    const rooms = await service.authorize({ headers: { cookie: 'mtw_access=tok' } });
    expect(auth.verifyAccessToken).toHaveBeenCalledWith('tok');
    expect(rooms).toEqual(['outlet:outlet-1:cashier']);
  });

  it('staf dengan auth.token (klien non-browser) juga diterima', async () => {
    const { service, auth } = authSetup();
    await service.authorize({ headers: {}, auth: { token: 'bearer-tok' } });
    expect(auth.verifyAccessToken).toHaveBeenCalledWith('bearer-tok');
  });

  it('token staf tidak valid → UNAUTHORIZED', async () => {
    const { service, auth } = authSetup();
    auth.verifyAccessToken.mockRejectedValue(new AppException(ErrorCode.UNAUTHORIZED, 'x'));
    expect(await codeOf(service.authorize({ headers: { cookie: 'mtw_access=basi' } }))).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('pelanggan dengan token meja + kode pesanan miliknya → room pesanan', async () => {
    const { service, prisma } = authSetup();
    const rooms = await service.authorize({ headers: {}, auth: { tableToken: 't', orderCode: CODE } });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { orderCode: CODE, tableId: 'table-1' },
      select: { id: true },
    });
    expect(rooms).toEqual([`order:${CODE}`]);
  });

  it('kode pesanan milik meja lain atau format salah → NOT_FOUND', async () => {
    const { service, prisma } = authSetup();
    prisma.order.findFirst.mockResolvedValue(null);
    expect(await codeOf(service.authorize({ headers: {}, auth: { tableToken: 't', orderCode: CODE } }))).toBe(
      ErrorCode.NOT_FOUND,
    );
    expect(await codeOf(service.authorize({ headers: {}, auth: { tableToken: 't', orderCode: 'x' } }))).toBe(
      ErrorCode.NOT_FOUND,
    );
  });

  it('token meja tidak valid → INVALID_TABLE_TOKEN', async () => {
    const { service, tables } = authSetup();
    tables.resolveToken.mockRejectedValue(new AppException(ErrorCode.INVALID_TABLE_TOKEN, 'x'));
    expect(await codeOf(service.authorize({ headers: {}, auth: { tableToken: 't', orderCode: CODE } }))).toBe(
      ErrorCode.INVALID_TABLE_TOKEN,
    );
  });

  it('tanpa kredensial (atau hanya token meja tanpa kode) → UNAUTHORIZED', async () => {
    const { service } = authSetup();
    expect(await codeOf(service.authorize({ headers: {} }))).toBe(ErrorCode.UNAUTHORIZED);
    expect(await codeOf(service.authorize({ headers: {}, auth: { tableToken: 't' } }))).toBe(ErrorCode.UNAUTHORIZED);
  });
});

describe('RealtimeService — event (FR-007, FR-008)', () => {
  const order = {
    orderCode: CODE,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    customerPhone: '081234567890',
  } as StaffOrderDto;

  function emitterSetup() {
    const emitted: { room: string; event: string; payload: unknown }[] = [];
    const server = {
      to: vi.fn((room: string) => ({
        emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
      })),
    };
    const realtime = new RealtimeService();
    realtime.attach(server as unknown as Namespace);
    return { emitted, server, realtime };
  }

  it('order.created hanya ke room kasir, berisi kartu lengkap', () => {
    const { realtime, emitted } = emitterSetup();
    realtime.orderCreated('outlet-1', order);
    expect(emitted).toEqual([{ room: 'outlet:outlet-1:cashier', event: 'order.created', payload: order }]);
  });

  it('order.updated: kasir dapat DTO lengkap, pelanggan hanya status (tanpa data pribadi)', () => {
    const { realtime, emitted } = emitterSetup();
    realtime.orderUpdated('outlet-1', order);
    expect(emitted).toEqual([
      { room: 'outlet:outlet-1:cashier', event: 'order.updated', payload: { orderCode: CODE, status: 'CONFIRMED', order } },
      { room: `order:${CODE}`, event: 'order.updated', payload: { orderCode: CODE, status: 'CONFIRMED' } },
    ]);
  });

  it('payment.updated ke room kasir & pesanan', () => {
    const { realtime, emitted } = emitterSetup();
    realtime.paymentUpdated('outlet-1', order);
    expect(emitted.map((e) => [e.room, e.event])).toEqual([
      ['outlet:outlet-1:cashier', 'payment.updated'],
      [`order:${CODE}`, 'payment.updated'],
    ]);
    expect(emitted[1]!.payload).toEqual({ orderCode: CODE, paymentStatus: 'PAID' });
  });

  it('tanpa server (gateway belum siap) atau emit gagal: tidak melempar error', () => {
    expect(() => new RealtimeService().orderCreated('outlet-1', order)).not.toThrow();
    const { realtime, server } = emitterSetup();
    server.to.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => realtime.orderUpdated('outlet-1', order)).not.toThrow();
  });
});
