import { Inject, Injectable, Optional } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { CreateOrderInput, PublicOrderDto } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RateLimitService } from '../../redis/rate-limit.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { TablesService } from '../tables/tables.service.js';
import { nextOrderCode, ORDER_CODE_PATTERN, orderCodePrefix } from './order-code.js';
import { orderInclude, toPublicOrderDto, toStaffOrderDto, type OrderWithItems } from './order.mapper.js';
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

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

/** Pesanan tamu dari QR meja (FR-004, FR-006). Transisi status ada di order-status.machine.ts. */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TablesService) private readonly tables: TablesService,
    @Inject(PublicMenuService) private readonly menu: PublicMenuService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  async create(input: CreateOrderInput, ctx: CreateOrderContext): Promise<PublicOrderDto> {
    const { table, outlet } = await this.tables.resolveToken(ctx.tableToken);

    const outletMeta = this.prisma.outlet?.findUnique
      ? await this.prisma.outlet.findUnique({
          where: { id: outlet.id },
          select: {
            name: true,
            qrisEnabled: true,
            telegramBotToken: true,
            telegramChatId: true,
            whatsappWebhookUrl: true,
          },
        })
      : null;

    if (input.paymentMethod === 'QRIS' && outletMeta?.qrisEnabled === false) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Pembayaran QRIS saat ini dinonaktifkan untuk outlet ini. Silakan bayar di kasir.',
      );
    }

    // Double-tap / retry: kembalikan pesanan awal tanpa menghitung rate limit lagi.
    const existing = await this.findByIdempotencyKey(ctx.idempotencyKey);
    if (existing) throw this.duplicate(existing, table.id);

    await this.enforceRateLimit(table.id, ctx.ip);

    let created: {
      order: OrderWithItems;
      stockChanged: boolean;
      lowStockItems: Array<{ name: string; stock: number | null }>;
    };
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
    this.realtime.orderCreated(outlet.id, toStaffOrderDto(created.order));

    if (this.notifications && outletMeta) {
      void this.notifications.sendOrderAlert(outletMeta, created.order);
      if (created.lowStockItems.length > 0) {
        void this.notifications.sendLowStockAlert(outletMeta, created.lowStockItems);
      }
    }

    return toPublicOrderDto(created.order);
  }

  /**
   * Status pesanan untuk pelanggan (FR-007). Hanya bisa dibuka dengan token meja tempat pesanan
   * dibuat; kode milik meja lain dijawab NOT_FOUND agar tidak bocor (PRD 2.2.4).
   */
  async getForTable(orderCode: string, tableToken: string): Promise<PublicOrderDto> {
    const { table } = await this.tables.resolveToken(tableToken);
    const order = ORDER_CODE_PATTERN.test(orderCode)
      ? await this.prisma.order.findFirst({ where: { orderCode, tableId: table.id }, include: orderInclude })
      : null;
    if (!order) throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');
    return toPublicOrderDto(order);
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

    const now = new Date();
    const dbPromos = tx.promo
      ? await tx.promo.findMany({
          where: {
            outletId: ref.outletId,
            isActive: true,
            startsOn: { lte: now },
            endsOn: { gte: now },
          },
          include: { items: true },
        })
      : [];

    const activePromos = dbPromos.map((p) => ({
      id: p.id,
      title: p.title,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minPurchase: p.minPurchase,
      activeDays: p.activeDays,
      maxQuantity: p.maxQuantity,
      usedQuantity: p.usedQuantity,
      applicableMenuItemIds: p.items.map((pi) => pi.menuItemId),
    }));

    const priced: PricedOrder = priceOrder(input.items, menuItems, activePromos, now);

    const lowStockItems: Array<{ name: string; stock: number | null }> = [];
    for (const [menuItemId, quantity] of priced.stockDecrements) {
      const updatedItem = await tx.menuItem.update({
        where: { id: menuItemId },
        data: { stock: { decrement: quantity } },
      });
      if (updatedItem && updatedItem.stock !== null && updatedItem.stock <= 5) {
        lowStockItems.push({ name: updatedItem.name, stock: updatedItem.stock });
      }
    }

    if (priced.promoUsageIncrements && tx.promo?.updateMany) {
      for (const [promoId, qtyUsed] of priced.promoUsageIncrements) {
        await tx.promo.updateMany({
          where: { id: promoId },
          data: { usedQuantity: { increment: qtyUsed } },
        });
      }
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
      include: orderInclude,
    });

    return { order, stockChanged: priced.stockDecrements.size > 0, lowStockItems };
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
    return this.prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
  }

  /** PRD 4.5: DUPLICATE_REQUEST membawa response awal, hanya untuk meja yang sama. */
  private duplicate(order: OrderWithItems, tableId: string) {
    const sameTable = order.tableId === tableId;
    return new AppException(
      ErrorCode.DUPLICATE_REQUEST,
      'Pesanan ini sudah dikirim sebelumnya.',
      sameTable ? { order: toPublicOrderDto(order) } : undefined,
    );
  }
}
