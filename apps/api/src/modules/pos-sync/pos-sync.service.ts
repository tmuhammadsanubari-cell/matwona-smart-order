import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import { SyncDirection, SyncEntity, SyncStatus } from '../../generated/prisma/client.js';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import {
  POS_SYNC_ADAPTER,
  type ExternalProduct,
  type PaidOrderForPos,
  type PosSyncAdapter,
  type RowError,
} from './adapters/pos-sync.adapter.js';

export interface DiffProduct {
  name: string;
  categoryName?: string;
  sku?: string;
  status: 'new' | 'changed' | 'unchanged';
  oldPrice?: number;
  newPrice: number;
}

export interface PreviewResult {
  logId: string;
  fileName?: string;
  summary: {
    newCount: number;
    changedCount: number;
    unchangedCount: number;
    errorCount: number;
  };
  diff: DiffProduct[];
  errors: RowError[];
}

@Injectable()
export class PosSyncService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(POS_SYNC_ADAPTER) private readonly adapter: PosSyncAdapter,
    @Inject(PublicMenuService) private readonly publicMenu: PublicMenuService,
  ) {}

  async previewProducts(
    outletId: string,
    fileBuffer: Buffer,
    fileName?: string,
    columnMapping?: Record<string, string>,
    userId?: string,
  ): Promise<PreviewResult> {
    const pullResult = await this.adapter.pullProducts({
      file: fileBuffer,
      columnMapping,
    });

    const existingItems = await this.prisma.menuItem.findMany({
      where: { outletId, isArchived: false },
      include: { category: true },
    });

    const itemBySku = new Map(existingItems.filter((i) => i.sku).map((i) => [i.sku!, i]));
    const itemByOlsera = new Map(existingItems.filter((i) => i.olseraProductId).map((i) => [i.olseraProductId!, i]));
    const itemByName = new Map(existingItems.map((i) => [i.name.trim().toLowerCase(), i]));

    const diff: DiffProduct[] = [];
    let newCount = 0;
    let changedCount = 0;
    let unchangedCount = 0;

    for (const item of pullResult.items) {
      const match =
        (item.externalId && itemByOlsera.get(item.externalId)) ||
        (item.sku && itemBySku.get(item.sku)) ||
        itemByName.get(item.name.trim().toLowerCase());

      if (!match) {
        newCount++;
        diff.push({
          name: item.name,
          categoryName: item.categoryName,
          sku: item.sku,
          status: 'new',
          newPrice: item.price,
        });
      } else if (match.price !== item.price || match.name !== item.name) {
        changedCount++;
        diff.push({
          name: item.name,
          categoryName: item.categoryName,
          sku: item.sku,
          status: 'changed',
          oldPrice: match.price,
          newPrice: item.price,
        });
      } else {
        unchangedCount++;
        diff.push({
          name: item.name,
          categoryName: item.categoryName,
          sku: item.sku,
          status: 'unchanged',
          oldPrice: match.price,
          newPrice: item.price,
        });
      }
    }

    const log = await this.prisma.posSyncLog.create({
      data: {
        outletId,
        adapter: this.adapter.name,
        direction: SyncDirection.PULL,
        entity: SyncEntity.PRODUCT,
        status: SyncStatus.PREVIEW,
        successCount: pullResult.items.length,
        failedCount: pullResult.errors.length,
        fileName: fileName ?? 'olsera_products.csv',
        triggeredByUserId: userId,
        errors: pullResult.errors.length > 0 ? JSON.parse(JSON.stringify(pullResult.errors)) : undefined,
        previewPayload: JSON.parse(
          JSON.stringify({
            items: pullResult.items,
            summary: { newCount, changedCount, unchangedCount, errorCount: pullResult.errors.length },
          }),
        ),
      },
    });

    return {
      logId: log.id,
      fileName: fileName ?? 'olsera_products.csv',
      summary: {
        newCount,
        changedCount,
        unchangedCount,
        errorCount: pullResult.errors.length,
      },
      diff,
      errors: pullResult.errors,
    };
  }

  async applyProducts(outletId: string, logId: string, userId: string) {
    const log = await this.prisma.posSyncLog.findFirst({
      where: { id: logId, outletId },
    });

    if (!log) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Log sinkronisasi tidak ditemukan');
    }
    if (log.status !== SyncStatus.PREVIEW) {
      throw new AppException(ErrorCode.SYNC_FILE_INVALID, 'Data sinkronisasi ini sudah diterapkan atau kedaluwarsa');
    }

    const payload = log.previewPayload as { items?: ExternalProduct[] } | null;
    const items = payload?.items ?? [];

    await this.prisma.$transaction(async (tx) => {
      // Kelompokkan kategori yang belum ada
      const existingCategories = await tx.category.findMany({ where: { outletId } });
      const catMap = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));

      let sortOrderCounter = existingCategories.length;
      for (const item of items) {
        const catName = item.categoryName?.trim() || 'Umum';
        const lowerCat = catName.toLowerCase();
        let cat = catMap.get(lowerCat);
        if (!cat) {
          cat = await tx.category.create({
            data: {
              outletId,
              name: catName,
              sortOrder: sortOrderCounter++,
            },
          });
          catMap.set(lowerCat, cat);
        }

        // Cari item berdasarkan olseraProductId, sku, atau nama
        let existingItem = null;
        if (item.externalId) {
          existingItem = await tx.menuItem.findFirst({
            where: { outletId, olseraProductId: item.externalId },
          });
        }
        if (!existingItem && item.sku) {
          existingItem = await tx.menuItem.findFirst({
            where: { outletId, sku: item.sku },
          });
        }
        if (!existingItem) {
          existingItem = await tx.menuItem.findFirst({
            where: { outletId, name: item.name },
          });
        }

        if (existingItem) {
          await tx.menuItem.update({
            where: { id: existingItem.id },
            data: {
              name: item.name,
              price: item.price,
              stock: item.stock !== undefined ? item.stock : existingItem.stock,
              isAvailable: item.isActive !== undefined ? item.isActive : existingItem.isAvailable,
              olseraProductId: item.externalId || existingItem.olseraProductId,
              sku: item.sku || existingItem.sku,
              lastSyncedAt: new Date(),
            },
          });
        } else {
          await tx.menuItem.create({
            data: {
              outletId,
              categoryId: cat.id,
              name: item.name,
              price: item.price,
              sku: item.sku || undefined,
              olseraProductId: item.externalId || undefined,
              stock: item.stock ?? null,
              isAvailable: item.isActive ?? true,
              lastSyncedAt: new Date(),
            },
          });
        }
      }

      await tx.posSyncLog.update({
        where: { id: log.id },
        data: {
          status: log.failedCount > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS,
          triggeredByUserId: userId,
        },
      });
    });

    await this.publicMenu.invalidate(outletId);
    return { applied: items.length };
  }

  async exportTransactions(outletId: string, fromDate?: string, toDate?: string, userId?: string) {
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        paymentStatus: 'PAID',
        paidAt: { gte: from, lte: to },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { paidAt: 'asc' },
    });

    const ordersForPos: PaidOrderForPos[] = orders.map((o) => ({
      orderCode: o.orderCode,
      paidAt: o.paidAt ?? o.createdAt,
      tableLabel: o.table?.label ?? null,
      paymentMethod: o.paymentMethod,
      subtotalAmount: o.subtotalAmount,
      discountAmount: o.discountAmount,
      totalAmount: o.totalAmount,
      lines: o.items.map((i) => ({
        sku: i.menuItem?.sku ?? null,
        olseraProductId: i.menuItem?.olseraProductId ?? null,
        name: i.itemNameSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        lineTotal: i.lineTotal,
      })),
    }));

    const result = await this.adapter.pushTransactions(ordersForPos);

    if (result.kind === 'file') {
      await this.prisma.posSyncLog.create({
        data: {
          outletId,
          adapter: this.adapter.name,
          direction: SyncDirection.PUSH,
          entity: SyncEntity.TRANSACTION,
          status: SyncStatus.SUCCESS,
          successCount: orders.length,
          fileName: result.fileName,
          triggeredByUserId: userId,
        },
      });
    }

    return result;
  }

  async getLogs(outletId: string) {
    const logs = await this.prisma.posSyncLog.findMany({
      where: { outletId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { triggeredBy: { select: { name: true, role: true } } },
    });

    return logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      direction: l.direction === SyncDirection.PULL ? 'Tarik' : 'Kirim',
      entity: l.entity === SyncEntity.PRODUCT ? 'Produk' : 'Transaksi',
      status: l.status,
      successCount: l.successCount,
      failedCount: l.failedCount,
      fileName: l.fileName,
      userName: l.triggeredBy?.name ?? 'Sistem',
    }));
  }
}
