import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { AuthUser, OrderListQuery, StaffOrderDto, UpdateOrderStatusInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { wibDate, wibDayRange } from '../../common/wib.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { assertCanMarkPaid, assertTransition } from './order-status.machine.js';
import { orderInclude, toStaffOrderDto, type OrderWithItems } from './order.mapper.js';

/** Batas jumlah pesanan per respons daftar; dashboard kasir memuat satu hari. */
export const ORDER_LIST_LIMIT = 200;

/**
 * Pesanan untuk kasir & admin (FR-006, FR-008). Aturan transisi hanya di order-status.machine.ts.
 * Semua query difilter outletId staf (NFR-016) dan hanya pesanan digital (bukan impor Olsera).
 */
@Injectable()
export class StaffOrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PublicMenuService) private readonly menu: PublicMenuService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
  ) {}

  async list(outletId: string, query: OrderListQuery): Promise<StaffOrderDto[]> {
    const today = wibDate(new Date());
    const where: Prisma.OrderWhereInput = {
      outletId,
      source: 'DIGITAL',
      createdAt: wibDayRange(query.from ?? query.to ?? today, query.to ?? today),
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { orderCode: { contains: query.q, mode: 'insensitive' } },
          { table: { label: { equals: query.q, mode: 'insensitive' } } },
        ],
      }),
    };
    const orders = await this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: ORDER_LIST_LIMIT,
    });
    return orders.map(toStaffOrderDto);
  }

  async get(outletId: string, id: string): Promise<StaffOrderDto> {
    return toStaffOrderDto(await this.findOrThrow(outletId, id));
  }

  async updateStatus(user: AuthUser, id: string, input: UpdateOrderStatusInput): Promise<StaffOrderDto> {
    const order = await this.findOrThrow(user.outletId, id);
    assertTransition(order, input.status);
    await this.prisma.$transaction((tx) =>
      this.guardedUpdate(tx, order, {
        status: input.status,
        handledByUserId: order.handledByUserId ?? user.id,
      }),
    );
    const updated = await this.get(user.outletId, id);
    this.realtime.orderUpdated(user.outletId, updated);
    return updated;
  }

  async markPaid(user: AuthUser, id: string): Promise<StaffOrderDto> {
    const order = await this.findOrThrow(user.outletId, id);
    assertCanMarkPaid(order);
    await this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, order, { paymentStatus: 'PAID', paidByUserId: user.id, paidAt: new Date() });
      await tx.payment.create({
        data: { orderId: order.id, provider: 'CASHIER', status: 'PAID', amount: order.totalAmount },
      });
    });
    const updated = await this.get(user.outletId, id);
    this.realtime.paymentUpdated(user.outletId, updated);
    return updated;
  }

  async cancel(user: AuthUser, id: string, reason: string): Promise<StaffOrderDto> {
    const order = await this.findOrThrow(user.outletId, id);
    assertTransition(order, 'CANCELLED');

    const restoredStock = await this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, order, {
        status: 'CANCELLED',
        cancelReason: reason,
        handledByUserId: order.handledByUserId ?? user.id,
      });
      return this.restoreStock(tx, order);
    });

    if (restoredStock) await this.menu.invalidate(order.outletId);
    const updated = await this.get(user.outletId, id);
    this.realtime.orderUpdated(user.outletId, updated);
    return updated;
  }

  /**
   * Kembalikan stok item yang masih dilacak (stock != null). Item yang sejak itu berhenti dilacak
   * dilewati. Mengembalikan true bila ada stok yang berubah.
   */
  private async restoreStock(tx: Prisma.TransactionClient, order: OrderWithItems): Promise<boolean> {
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      quantities.set(item.menuItemId, (quantities.get(item.menuItemId) ?? 0) + item.quantity);
    }
    let changed = false;
    for (const [menuItemId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
      const { count } = await tx.menuItem.updateMany({
        where: { id: menuItemId, outletId: order.outletId, stock: { not: null } },
        data: { stock: { increment: quantity } },
      });
      changed ||= count > 0;
    }
    return changed;
  }

  /**
   * Update hanya bila status & status bayar belum berubah sejak dibaca. Mencegah dua kasir
   * membatalkan (dan mengembalikan stok) dua kali, atau transisi berdasarkan data basi.
   */
  private async guardedUpdate(
    tx: Prisma.TransactionClient,
    order: OrderWithItems,
    data: Prisma.OrderUncheckedUpdateManyInput,
  ) {
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus },
      data,
    });
    if (count === 0) {
      throw new AppException(
        ErrorCode.INVALID_STATUS_TRANSITION,
        'Pesanan baru saja diubah oleh pengguna lain. Muat ulang lalu coba lagi.',
      );
    }
  }

  private async findOrThrow(outletId: string, id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({
      where: { id, outletId, source: 'DIGITAL' },
      include: orderInclude,
    });
    if (!order) throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');
    return order;
  }
}
