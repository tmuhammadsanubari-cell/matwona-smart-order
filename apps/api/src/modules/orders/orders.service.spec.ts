import { ErrorCode } from 'shared';
import type { CreateOrderInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RateLimitService } from '../../redis/rate-limit.service.js';
import type { PublicMenuService } from '../menu/public-menu.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import type { TablesService } from '../tables/tables.service.js';
import { orderRateLimitKeys, OrdersService } from './orders.service.js';

const TUNA = '00000000-0000-4000-8000-000000000001';
const ESTEH = '00000000-0000-4000-8000-000000000002';
const KEY = '0192f1a4-6c3e-7b2a-9d41-5f0e8c7a1b22';
const CTX = { tableToken: 'token', idempotencyKey: KEY, ip: '10.0.0.1' };
const TABLE = { id: 'table-1', label: 'A3' };
const OUTLET = { id: 'outlet-1', slug: 'matwona', name: 'Matwona' };

const input = (overrides: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  customerName: 'Rina',
  paymentMethod: 'CASHIER',
  items: [{ menuItemId: TUNA, quantity: 2, fromRecommendation: false }],
  ...overrides,
});

function storedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderCode: 'MTW-261105-0001',
    outletId: OUTLET.id,
    tableId: TABLE.id,
    customerName: 'Rina',
    customerPhone: null,
    status: 'NEW',
    paymentMethod: 'CASHIER',
    paymentStatus: 'UNPAID',
    subtotalAmount: 90000,
    discountAmount: 0,
    totalAmount: 90000,
    idempotencyKey: KEY,
    createdAt: new Date('2026-11-05T05:12:44Z'),
    updatedAt: new Date('2026-11-05T05:12:44Z'),
    paidAt: null,
    cancelReason: null,
    table: { label: TABLE.label },
    items: [
      {
        menuItemId: TUNA,
        itemNameSnapshot: 'Tuna Sambal Matah',
        quantity: 2,
        unitPrice: 45000,
        discountAmount: 0,
        lineTotal: 90000,
        note: null,
      },
    ],
    ...overrides,
  };
}

function setup() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(1),
    menuItem: {
      findMany: vi.fn().mockResolvedValue([
        { id: TUNA, name: 'Tuna Sambal Matah', price: 45000, stock: 10, isAvailable: true, isArchived: false },
        { id: ESTEH, name: 'Es Teh Serai', price: 8000, stock: null, isAvailable: true, isArchived: false },
      ]),
      update: vi.fn(),
    },
    order: {
      findFirst: vi.fn().mockResolvedValue({ orderCode: 'MTW-261105-0041' }),
      create: vi.fn(async ({ data }: { data: { items: { create: unknown[] } } & Record<string, unknown> }) =>
        storedOrder({ ...data, items: data.items.create }),
      ),
    },
  };
  const prisma = {
    order: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const tables = { resolveToken: vi.fn().mockResolvedValue({ table: TABLE, outlet: OUTLET }) };
  const menu = { invalidate: vi.fn() };
  const rateLimit = { hit: vi.fn().mockResolvedValue(true) };
  const realtime = { orderCreated: vi.fn() };
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    tables as unknown as TablesService,
    menu as unknown as PublicMenuService,
    rateLimit as unknown as RateLimitService,
    realtime as unknown as RealtimeService,
  );
  return { tx, prisma, tables, menu, rateLimit, realtime, service };
}

async function expectAppError(promise: Promise<unknown>, code: ErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  return error as AppException;
}

describe('OrdersService.create (FR-004, FR-006)', () => {
  it('bayar di kasir: status NEW + UNPAID, harga dari DB, stok dikurangi, cache menu di-invalidate', async () => {
    const { service, tx, menu, tables, realtime } = setup();
    const order = await service.create(input({ customerPhone: '081234567890' }), CTX);

    expect(tables.resolveToken).toHaveBeenCalledWith('token');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1); // SELECT ... FOR UPDATE
    expect(tx.menuItem.update).toHaveBeenCalledWith({ where: { id: TUNA }, data: { stock: { decrement: 2 } } });

    const data = tx.order.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      outletId: OUTLET.id,
      tableId: TABLE.id,
      customerPhone: '081234567890',
      paymentMethod: 'CASHIER',
      paymentStatus: 'UNPAID',
      subtotalAmount: 90000,
      totalAmount: 90000,
      idempotencyKey: KEY,
    });
    expect(String(data.orderCode)).toMatch(/^MTW-\d{6}-0042$/);
    expect(menu.invalidate).toHaveBeenCalledWith(OUTLET.id);
    expect(order).toMatchObject({ table: 'A3', status: 'NEW', paymentStatus: 'UNPAID', totalAmount: 90000 });
    // NFR-002: kasir menerima kartu pesanan lengkap (termasuk no. HP & aksi yang tersedia).
    expect(realtime.orderCreated).toHaveBeenCalledWith(
      OUTLET.id,
      expect.objectContaining({ customerPhone: '081234567890', allowedNextStatuses: ['CONFIRMED', 'CANCELLED'] }),
    );
  });

  it('QRIS dibuat dengan payment_status PENDING', async () => {
    const { service, tx } = setup();
    await service.create(input({ paymentMethod: 'QRIS' }), CTX);
    expect(tx.order.create.mock.calls[0]![0].data.paymentStatus).toBe('PENDING');
  });

  it('item tanpa pelacakan stok: stok tidak disentuh dan cache tidak di-invalidate', async () => {
    const { service, tx, menu } = setup();
    await service.create(input({ items: [{ menuItemId: ESTEH, quantity: 1, fromRecommendation: false }] }), CTX);
    expect(tx.menuItem.update).not.toHaveBeenCalled();
    expect(menu.invalidate).not.toHaveBeenCalled();
  });

  it('Idempotency-Key yang sudah dipakai: DUPLICATE_REQUEST membawa pesanan awal, tanpa transaksi & rate limit', async () => {
    const { service, prisma, rateLimit } = setup();
    prisma.order.findUnique.mockResolvedValue(storedOrder());

    const error = await expectAppError(service.create(input(), CTX), ErrorCode.DUPLICATE_REQUEST);
    expect((error.details as { order: { orderCode: string } }).order.orderCode).toBe('MTW-261105-0001');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(rateLimit.hit).not.toHaveBeenCalled();
  });

  it('Idempotency-Key milik meja lain: DUPLICATE_REQUEST tanpa membocorkan data', async () => {
    const { service, prisma } = setup();
    prisma.order.findUnique.mockResolvedValue(storedOrder({ tableId: 'table-lain' }));
    const error = await expectAppError(service.create(input(), CTX), ErrorCode.DUPLICATE_REQUEST);
    expect(error.details).toBeUndefined();
  });

  it('request paralel dengan key sama: pelanggaran unik dijawab DUPLICATE_REQUEST', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    prisma.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(storedOrder());
    await expectAppError(service.create(input(), CTX), ErrorCode.DUPLICATE_REQUEST);
  });

  it('rate limit per meja & per IP (NFR-009): melebihi batas → RATE_LIMITED tanpa menyentuh DB', async () => {
    const { service, prisma, rateLimit } = setup();
    rateLimit.hit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expectAppError(service.create(input(), CTX), ErrorCode.RATE_LIMITED);
    expect(rateLimit.hit.mock.calls.map((c) => c[0])).toEqual(orderRateLimitKeys(TABLE.id, CTX.ip));
    expect(rateLimit.hit).toHaveBeenCalledWith(expect.any(String), 5, 600);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('item habis: error dari transaksi diteruskan, stok tidak dikurangi', async () => {
    const { service, tx, menu, realtime } = setup();
    tx.menuItem.findMany.mockResolvedValue([
      { id: TUNA, name: 'Tuna Sambal Matah', price: 45000, stock: 1, isAvailable: true, isArchived: false },
    ]);
    await expectAppError(service.create(input(), CTX), ErrorCode.ITEM_UNAVAILABLE);
    expect(tx.menuItem.update).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(menu.invalidate).not.toHaveBeenCalled();
    expect(realtime.orderCreated).not.toHaveBeenCalled();
  });

  it('token meja tidak valid ditolak sebelum apa pun', async () => {
    const { service, tables, prisma } = setup();
    tables.resolveToken.mockRejectedValue(new AppException(ErrorCode.INVALID_TABLE_TOKEN, 'x'));
    await expectAppError(service.create(input(), CTX), ErrorCode.INVALID_TABLE_TOKEN);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });
});

describe('OrdersService.getForTable (FR-007)', () => {
  it('mengembalikan pesanan bila dibuat dari meja token tersebut', async () => {
    const { service, prisma } = setup();
    Object.assign(prisma.order, { findFirst: vi.fn().mockResolvedValue(storedOrder()) });
    const order = await service.getForTable('MTW-261105-0001', 'token');
    expect(order.orderCode).toBe('MTW-261105-0001');
    expect((prisma.order as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mock.calls[0]![0].where).toEqual({
      orderCode: 'MTW-261105-0001',
      tableId: TABLE.id,
    });
  });

  it('pesanan meja lain atau kode tidak valid → NOT_FOUND', async () => {
    const { service, prisma } = setup();
    Object.assign(prisma.order, { findFirst: vi.fn().mockResolvedValue(null) });
    await expectAppError(service.getForTable('MTW-261105-0001', 'token'), ErrorCode.NOT_FOUND);
    await expectAppError(service.getForTable('bukan-kode', 'token'), ErrorCode.NOT_FOUND);
  });
});
