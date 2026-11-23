import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import {
  MappingEntity,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SyncDirection,
  SyncEntity,
  SyncStatus,
} from '../../generated/prisma/client.js';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { DEFAULT_PRODUCT_MAPPING } from './adapters/olsera-csv.adapter.js';
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

  async getMapping(outletId: string, entity: MappingEntity = MappingEntity.PRODUCT): Promise<Record<string, string>> {
    const record = await this.prisma.posColumnMapping.findUnique({
      where: { outletId_entity: { outletId, entity } },
    });
    if (record && typeof record.mapping === 'object' && record.mapping !== null) {
      return record.mapping as Record<string, string>;
    }
    return DEFAULT_PRODUCT_MAPPING;
  }

  async saveMapping(outletId: string, entity: MappingEntity, mapping: Record<string, string>): Promise<Record<string, string>> {
    const record = await this.prisma.posColumnMapping.upsert({
      where: { outletId_entity: { outletId, entity } },
      create: {
        outletId,
        entity,
        mapping,
      },
      update: {
        mapping,
      },
    });
    return record.mapping as Record<string, string>;
  }

  async previewProducts(
    outletId: string,
    fileBuffer: Buffer,
    fileName?: string,
    columnMapping?: Record<string, string>,
    userId?: string,
    shouldSaveMapping = false,
  ): Promise<PreviewResult> {
    let effectiveMapping = columnMapping;
    if (effectiveMapping && shouldSaveMapping) {
      await this.saveMapping(outletId, MappingEntity.PRODUCT, effectiveMapping);
    } else if (!effectiveMapping) {
      effectiveMapping = await this.getMapping(outletId, MappingEntity.PRODUCT);
    }

    const pullResult = await this.adapter.pullProducts({
      file: fileBuffer,
      columnMapping: effectiveMapping,
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

  async importTransactions(
    outletId: string,
    fileBuffer: Buffer,
    fileName?: string,
    userId?: string,
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    errors: RowError[];
  }> {
    const pullResult = await this.adapter.pullTransactions({ file: fileBuffer });
    if (pullResult.items.length === 0 && pullResult.errors.length > 0) {
      throw new AppException(ErrorCode.SYNC_FILE_INVALID, pullResult.errors[0]?.reason ?? 'Format file transaksi tidak valid');
    }

    const existingItems = await this.prisma.menuItem.findMany({
      where: { outletId },
      select: { id: true, name: true, sku: true, olseraProductId: true, price: true },
    });
    const itemByOlsera = new Map(existingItems.filter((i) => i.olseraProductId).map((i) => [i.olseraProductId!, i]));
    const itemBySku = new Map(existingItems.filter((i) => i.sku).map((i) => [i.sku!, i]));
    const itemByName = new Map(existingItems.map((i) => [i.name.trim().toLowerCase(), i]));

    let defaultCategory = await this.prisma.category.findFirst({
      where: { outletId },
      orderBy: { sortOrder: 'asc' },
    });
    if (!defaultCategory) {
      defaultCategory = await this.prisma.category.create({
        data: {
          outletId,
          name: 'Umum',
          sortOrder: 0,
        },
      });
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Kelompokkan dan lacak prefix nomor pesanan harian
    const dailySeqMap = new Map<string, number>();

    for (const tx of pullResult.items) {
      // Cek idempotensi: bila pesanan dengan externalRef ini sudah pernah diimpor, lewati
      const existingOrder = await this.prisma.order.findUnique({
        where: {
          outletId_externalRef: {
            outletId,
            externalRef: tx.externalRef,
          },
        },
      });
      if (existingOrder) {
        skippedCount++;
        continue;
      }

      const ymd = tx.occurredAt.toISOString().slice(2, 10).replace(/-/g, '');
      const prefix = `OLS-${ymd}-`;

      let currentSeq = dailySeqMap.get(prefix);
      if (currentSeq === undefined) {
        const lastDaily = await this.prisma.order.findFirst({
          where: { orderCode: { startsWith: prefix } },
          orderBy: { orderCode: 'desc' },
          select: { orderCode: true },
        });
        currentSeq = lastDaily ? Number(lastDaily.orderCode.slice(prefix.length)) || 0 : 0;
      }
      currentSeq++;
      dailySeqMap.set(prefix, currentSeq);

      const orderCode = `${prefix}${String(currentSeq).padStart(4, '0')}`;
      const pmLower = (tx.paymentMethod ?? '').toLowerCase();
      const paymentMethod = pmLower.includes('qris') ? PaymentMethod.QRIS : PaymentMethod.CASHIER;

      const orderItemsData: Array<{
        menuItemId: string;
        itemNameSnapshot: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        lineTotal: number;
      }> = [];

      let subtotalAmount = 0;
      let discountAmount = 0;

      for (const line of tx.lines) {
        let menuItem =
          (line.externalProductId && itemByOlsera.get(line.externalProductId)) ||
          (line.sku && itemBySku.get(line.sku)) ||
          itemByName.get(line.name.trim().toLowerCase());

        if (!menuItem) {
          menuItem = await this.prisma.menuItem.create({
            data: {
              outletId,
              categoryId: defaultCategory.id,
              name: line.name,
              sku: line.sku,
              olseraProductId: line.externalProductId,
              price: line.unitPrice,
              isAvailable: true,
            },
            select: { id: true, name: true, sku: true, olseraProductId: true, price: true },
          });
          itemByName.set(menuItem.name.trim().toLowerCase(), menuItem);
          if (menuItem.sku) itemBySku.set(menuItem.sku, menuItem);
          if (menuItem.olseraProductId) itemByOlsera.set(menuItem.olseraProductId, menuItem);
        }

        const lineTotal = line.unitPrice * line.quantity - line.discountAmount;
        subtotalAmount += line.unitPrice * line.quantity;
        discountAmount += line.discountAmount;

        orderItemsData.push({
          menuItemId: menuItem.id,
          itemNameSnapshot: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          lineTotal: Math.max(0, lineTotal),
        });
      }

      const totalAmount = tx.total > 0 ? tx.total : Math.max(0, subtotalAmount - discountAmount);

      await this.prisma.order.create({
        data: {
          outletId,
          orderCode,
          externalRef: tx.externalRef,
          source: OrderSource.OLSERA_IMPORT,
          customerName: 'Pelanggan Olsera',
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod,
          subtotalAmount,
          discountAmount,
          totalAmount,
          paidAt: tx.occurredAt,
          createdAt: tx.occurredAt,
          items: {
            create: orderItemsData,
          },
        },
      });

      importedCount++;
    }

    await this.prisma.posSyncLog.create({
      data: {
        outletId,
        adapter: this.adapter.name,
        direction: SyncDirection.PULL,
        entity: SyncEntity.TRANSACTION,
        status: pullResult.errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS,
        successCount: importedCount,
        failedCount: pullResult.errors.length,
        fileName: fileName ?? 'olsera_transactions.csv',
        triggeredByUserId: userId,
        errors: pullResult.errors.length > 0 ? JSON.parse(JSON.stringify(pullResult.errors)) : undefined,
      },
    });

    return {
      importedCount,
      skippedCount,
      errors: pullResult.errors,
    };
  }
}
