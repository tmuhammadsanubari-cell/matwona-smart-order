import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { CreateOrderInput, PublicOrderDto } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { Order, OrderItem, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RateLimitService } from '../../redis/rate-limit.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { TablesService } from '../tables/tables.service.js';
import { nextOrderCode, orderCodePrefix } from './order-code.js';
import { priceOrder, type PricedOrder } from './order-pricing.js';

/** NFR-009: maks. 5 pesanan / 10 menit per token meja dan per IP (bisa diubah lewat env). */
export const orderRateLimit = () => ({
  max: Number(process.env.ORDER_RATE_LIMIT_MAX ?? 5),
  windowSeconds: Number(process.env.ORDER_RATE_LIMIT_WINDOW_SEC ?? 600),
});

export const orderRateLimitKeys = (tableId: string, ip: string) => [
  `rl:order:table:${tableId}`,
  `rl:order:ip:${ip}`,
];

export interface CreateOrderContext {
  tableToken: string;
  idempotencyKey: string;
  ip: string;
}

type OrderWithItems = Order & { items: OrderItem[]; table: { label: string } | null };

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

const toDto = (order: OrderWithItems): PublicOrderDto => ({
  orderCode: order.orderCode,
  table: order.table?.label ?? '',
  customerName: order.customerName,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  subtotalAmount: order.subtotalAmount,
  discountAmount: order.discountAmount,
  totalAmount: order.totalAmount,
  items: order.items.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.itemNameSnapshot,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    lineTotal: item.lineTotal,
    note: item.note,
  })),
  createdAt: order.createdAt.toISOString(),
});

const withItems = {
  items: { orderBy: { createdAt: 'asc' } },
  table: { select: { label: true } },
} satisfies Prisma.OrderInclude;

/** Pesanan tamu dari QR meja (FR-004, FR-006). Transisi status ada di order-status.machine.ts. */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TablesService) private readonly tables: TablesService,
    @Inject(PublicMenuService) private readonly menu: PublicMenuService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  async create(input: CreateOrderInput, ctx: CreateOrderContext): Promise<PublicOrderDto> {
    const { table, outlet } = await this.tables.resolveToken(ctx.tableToken);

    // Double-tap / retry: kembalikan pesanan awal tanpa menghitung rate limit lagi.
    const existing = await this.findByIdempotencyKey(ctx.idempotencyKey);
    if (existing) throw this.duplicate(existing, table.id);

    await this.enforceRateLimit(table.id, ctx.ip);

    let created: { order: OrderWithItems; stockChanged: boolean };
    try {
      created = await this.prisma.$transaction((tx) =>
        this.insertOrder(tx, input, { outletId: outlet.id, tableId: table.id, idempotencyKey: ctx.idempotencyKey }),
      );
    } catch (e) {
      // Request paralel dengan Idempotency-Key sama: yang kalah ditolak constraint unik.
      if (isUniqueViolation(e)) {
        const winner = await this.findByIdempotencyKey(ctx.idempotencyKey);
        if (winner) throw this.duplicate(winner, table.id);
      }
      throw e;
    }

    if (created.stockChanged) await this.menu.invalidate(outlet.id);
    // TODO(S1-08): emit SocketEvent.ORDER_CREATED ke room kasir.
    return toDto(created.order);
  }

  private async insertOrder(
    tx: Prisma.TransactionClient,
    input: CreateOrderInput,
    ref: { outletId: string; tableId: string; idempotencyKey: string },
  ) {
    const ids = [...new Set(input.items.map((i) => i.menuItemId))].sort();

    // Kunci baris menu (urutan id tetap agar tidak deadlock) supaya stok tidak oversell.
    await tx.$queryRaw`
      SELECT id FROM menu_items
      WHERE id = ANY(${ids}::uuid[]) AND outlet_id = ${ref.outletId}::uuid
      ORDER BY id
      FOR UPDATE`;
    const menuItems = await tx.menuItem.findMany({ where: { id: { in: ids }, outletId: ref.outletId } });

    const priced: PricedOrder = priceOrder(input.items, menuItems);

    for (const [menuItemId, quantity] of priced.stockDecrements) {
      await tx.menuItem.update({ where: { id: menuItemId }, data: { stock: { decrement: quantity } } });
    }

    // Serialisasi nomor urut harian antar transaksi; lock lepas saat commit/rollback.
    const prefix = orderCodePrefix(new Date());
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;
    const last = await tx.order.findFirst({
      where: { orderCode: { startsWith: prefix } },
      orderBy: { orderCode: 'desc' },
      select: { orderCode: true },
    });

    const order = await tx.order.create({
      data: {
        orderCode: nextOrderCode(prefix, last?.orderCode ?? null),
        outletId: ref.outletId,
        tableId: ref.tableId,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        paymentMethod: input.paymentMethod,
        // Bayar di kasir: belum bayar. QRIS: menunggu pembayaran Midtrans (S2-01).
        paymentStatus: input.paymentMethod === 'CASHIER' ? 'UNPAID' : 'PENDING',
        subtotalAmount: priced.subtotalAmount,
        discountAmount: priced.discountAmount,
        totalAmount: priced.totalAmount,
        idempotencyKey: ref.idempotencyKey,
        items: { create: priced.lines },
      },
      include: withItems,
    });

    return { order, stockChanged: priced.stockDecrements.size > 0 };
  }

  private async enforceRateLimit(tableId: string, ip: string) {
    const { max, windowSeconds } = orderRateLimit();
    const results = await Promise.all(
      orderRateLimitKeys(tableId, ip).map((key) => this.rateLimit.hit(key, max, windowSeconds)),
    );
    if (results.includes(false)) {
      throw new AppException(
        ErrorCode.RATE_LIMITED,
        'Terlalu banyak pesanan dalam waktu singkat. Silakan coba lagi beberapa menit lagi atau hubungi kasir.',
      );
    }
  }

  private findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.order.findUnique({ where: { idempotencyKey }, include: withItems });
  }

  /** PRD 4.5: DUPLICATE_REQUEST membawa response awal, hanya untuk meja yang sama. */
  private duplicate(order: OrderWithItems, tableId: string) {
    const sameTable = order.tableId === tableId;
    return new AppException(
      ErrorCode.DUPLICATE_REQUEST,
      'Pesanan ini sudah dikirim sebelumnya.',
      sameTable ? { order: toDto(order) } : undefined,
    );
  }
}
