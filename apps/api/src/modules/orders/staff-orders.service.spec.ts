import { ErrorCode } from 'shared';
import type { AuthUser } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PublicMenuService } from '../menu/public-menu.service.js';
import { StaffOrdersService } from './staff-orders.service.js';

const OUTLET = 'outlet-1';
const KASIR: AuthUser = { id: 'kasir-1', outletId: OUTLET, name: 'Kasir', email: 'k@x', role: 'CASHIER' };

function stored(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderCode: 'MTW-261105-0001',
    outletId: OUTLET,
    tableId: 'table-1',
    customerName: 'Rina',
    customerPhone: null,
    status: 'NEW',
    paymentMethod: 'CASHIER',
    paymentStatus: 'UNPAID',
    subtotalAmount: 98000,
    discountAmount: 0,
    totalAmount: 98000,
    handledByUserId: null,
    paidByUserId: null,
    cancelReason: null,
    paidAt: null,
    createdAt: new Date('2026-11-05T05:00:00Z'),
    updatedAt: new Date('2026-11-05T05:00:00Z'),
    table: { label: 'A3' },
    items: [
      { menuItemId: 'tuna', itemNameSnapshot: 'Tuna', quantity: 2, unitPrice: 45000, discountAmount: 0, lineTotal: 90000, note: null },
      { menuItemId: 'teh', itemNameSnapshot: 'Es Teh', quantity: 1, unitPrice: 8000, discountAmount: 0, lineTotal: 8000, note: null },
      { menuItemId: 'tuna', itemNameSnapshot: 'Tuna', quantity: 1, unitPrice: 45000, discountAmount: 0, lineTotal: 45000, note: 'pedas' },
    ],
    ...overrides,
  };
}

function setup(order = stored()) {
  const tx = {
    order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    menuItem: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    payment: { create: vi.fn() },
  };
  const prisma = {
    order: { findFirst: vi.fn().mockResolvedValue(order), findMany: vi.fn().mockResolvedValue([order]) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const menu = { invalidate: vi.fn() };
  const service = new StaffOrdersService(prisma as unknown as PrismaService, menu as unknown as PublicMenuService);
  return { tx, prisma, menu, service };
}

async function expectAppError(promise: Promise<unknown>, code: ErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
}

describe('StaffOrdersService (FR-006, FR-008)', () => {
  it('list: default hari ini WIB, hanya pesanan digital outlet staf, pencarian kode/meja', async () => {
    const { service, prisma } = setup();
    const result = await service.list(OUTLET, { q: 'a3', status: 'NEW' });
    const args = prisma.order.findMany.mock.calls[0]![0];
    expect(args.where).toMatchObject({ outletId: OUTLET, source: 'DIGITAL', status: 'NEW' });
    expect(args.where.OR).toHaveLength(2);
    const { gte, lt } = args.where.createdAt;
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(result[0]).toMatchObject({ id: 'order-1', allowedNextStatuses: ['CONFIRMED', 'CANCELLED'], canMarkPaid: true });
  });

  it('list: rentang tanggal from–to inklusif', async () => {
    const { service, prisma } = setup();
    await service.list(OUTLET, { from: '2026-11-01', to: '2026-11-05' });
    expect(prisma.order.findMany.mock.calls[0]![0].where.createdAt).toEqual({
      gte: new Date('2026-10-31T17:00:00Z'),
      lt: new Date('2026-11-05T17:00:00Z'),
    });
  });

  it('pesanan outlet lain / tidak ada → NOT_FOUND', async () => {
    const { service, prisma } = setup();
    prisma.order.findFirst.mockResolvedValue(null);
    await expectAppError(service.get(OUTLET, 'x'), ErrorCode.NOT_FOUND);
    expect(prisma.order.findFirst.mock.calls[0]![0].where).toEqual({ id: 'x', outletId: OUTLET, source: 'DIGITAL' });
  });

  it('updateStatus: transisi sah disimpan bersyarat status lama + mencatat kasir', async () => {
    const { service, tx } = setup();
    await service.updateStatus(KASIR, 'order-1', { status: 'CONFIRMED' });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'NEW', paymentStatus: 'UNPAID' },
      data: { status: 'CONFIRMED', handledByUserId: 'kasir-1' },
    });
  });

  it('updateStatus: transisi tidak sah ditolak sebelum menyentuh DB', async () => {
    const { service, prisma } = setup();
    await expectAppError(service.updateStatus(KASIR, 'order-1', { status: 'SERVED' }), ErrorCode.INVALID_STATUS_TRANSITION);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updateStatus: QRIS belum lunas tidak bisa dikonfirmasi', async () => {
    const { service } = setup(stored({ paymentMethod: 'QRIS', paymentStatus: 'PENDING' }));
    await expectAppError(service.updateStatus(KASIR, 'order-1', { status: 'CONFIRMED' }), ErrorCode.PAYMENT_NOT_COMPLETED);
  });

  it('pesanan diubah kasir lain di saat bersamaan → INVALID_STATUS_TRANSITION', async () => {
    const { service, tx } = setup();
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expectAppError(service.updateStatus(KASIR, 'order-1', { status: 'CONFIRMED' }), ErrorCode.INVALID_STATUS_TRANSITION);
  });

  it('markPaid: PAID + paidBy + paidAt, mencatat payment CASHIER sebesar total', async () => {
    const { service, tx } = setup();
    await service.markPaid(KASIR, 'order-1');
    const { data } = tx.order.updateMany.mock.calls[0]![0];
    expect(data).toMatchObject({ paymentStatus: 'PAID', paidByUserId: 'kasir-1' });
    expect(data.paidAt).toBeInstanceOf(Date);
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: { orderId: 'order-1', provider: 'CASHIER', status: 'PAID', amount: 98000 },
    });
  });

  it('markPaid: pesanan QRIS ditolak', async () => {
    const { service, prisma } = setup(stored({ paymentMethod: 'QRIS', paymentStatus: 'PENDING' }));
    await expectAppError(service.markPaid(KASIR, 'order-1'), ErrorCode.INVALID_STATUS_TRANSITION);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancel: simpan alasan, kembalikan stok per menu (dijumlah), invalidate cache menu', async () => {
    const { service, tx, menu } = setup();
    await service.cancel(KASIR, 'order-1', 'Pelanggan batal pesan');
    expect(tx.order.updateMany.mock.calls[0]![0].data).toEqual({
      status: 'CANCELLED',
      cancelReason: 'Pelanggan batal pesan',
      handledByUserId: 'kasir-1',
    });
    expect(tx.menuItem.updateMany.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: 'teh', outletId: OUTLET, stock: { not: null } }, data: { stock: { increment: 1 } } },
      { where: { id: 'tuna', outletId: OUTLET, stock: { not: null } }, data: { stock: { increment: 3 } } },
    ]);
    expect(menu.invalidate).toHaveBeenCalledWith(OUTLET);
  });

  it('cancel: item tanpa pelacakan stok → cache tidak di-invalidate', async () => {
    const { service, tx, menu } = setup();
    tx.menuItem.updateMany.mockResolvedValue({ count: 0 });
    await service.cancel(KASIR, 'order-1', 'Pelanggan batal pesan');
    expect(menu.invalidate).not.toHaveBeenCalled();
  });

  it('cancel: pesanan yang sedang disiapkan tidak bisa dibatalkan, stok tidak berubah', async () => {
    const { service, tx } = setup(stored({ status: 'PREPARING' }));
    await expectAppError(service.cancel(KASIR, 'order-1', 'Pelanggan batal pesan'), ErrorCode.INVALID_STATUS_TRANSITION);
    expect(tx.menuItem.updateMany).not.toHaveBeenCalled();
  });

  it('cancel bersamaan oleh dua kasir: yang kalah tidak mengembalikan stok', async () => {
    const { service, tx } = setup();
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expectAppError(service.cancel(KASIR, 'order-1', 'Pelanggan batal pesan'), ErrorCode.INVALID_STATUS_TRANSITION);
    expect(tx.menuItem.updateMany).not.toHaveBeenCalled();
  });
});
