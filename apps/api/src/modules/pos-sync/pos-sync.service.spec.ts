/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosSyncService } from './pos-sync.service.js';
import { MappingEntity, SyncDirection, SyncEntity, SyncStatus } from '../../generated/prisma/client.js';

describe('PosSyncService', () => {
  let service: PosSyncService;
  let mockPrisma: any;
  let mockAdapter: any;
  let mockPublicMenu: any;

  const outletId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockPrisma = {
      posColumnMapping: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      posSyncLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      menuItem: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'item-new', ...data })),
        update: vi.fn(),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Umum' }),
        create: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Umum' }),
      },
      order: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'order-1', ...data })),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    mockAdapter = {
      name: 'olsera-csv',
      pullProducts: vi.fn(),
      pullTransactions: vi.fn(),
      pushTransactions: vi.fn(),
    };

    mockPublicMenu = {
      invalidate: vi.fn(),
    };

    service = new PosSyncService(mockPrisma, mockAdapter, mockPublicMenu);
  });

  describe('mapping', () => {
    it('returns default mapping when not saved', async () => {
      mockPrisma.posColumnMapping.findUnique.mockResolvedValue(null);
      const mapping = await service.getMapping(outletId, MappingEntity.PRODUCT);
      expect(mapping).toBeDefined();
      expect(mapping['nama']).toBe('name');
    });

    it('saves custom mapping', async () => {
      const custom = { 'nama menu': 'name' };
      mockPrisma.posColumnMapping.upsert.mockResolvedValue({ mapping: custom });
      const saved = await service.saveMapping(outletId, MappingEntity.PRODUCT, custom);
      expect(saved).toEqual(custom);
    });
  });

  describe('importTransactions', () => {
    it('imports new orders from adapter and skips duplicates', async () => {
      const csvBuffer = Buffer.from('dummy');
      mockAdapter.pullTransactions.mockResolvedValue({
        items: [
          {
            externalRef: 'OLS-INV-001',
            occurredAt: new Date('2026-11-08T10:00:00Z'),
            paymentMethod: 'QRIS',
            total: 35000,
            lines: [
              {
                name: 'Tuna Sambal Matah',
                sku: 'TSM01',
                quantity: 1,
                unitPrice: 35000,
                discountAmount: 0,
              },
            ],
          },
          {
            externalRef: 'OLS-INV-002',
            occurredAt: new Date('2026-11-08T10:05:00Z'),
            paymentMethod: 'Cash',
            total: 20000,
            lines: [
              {
                name: 'Es Teh Manis',
                quantity: 2,
                unitPrice: 10000,
                discountAmount: 0,
              },
            ],
          },
        ],
        errors: [],
      });

      // Mock first order already exists, second is new
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: 'existing-order' })
        .mockResolvedValueOnce(null);

      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await service.importTransactions(outletId, csvBuffer, 'olsera.csv', userId);

      expect(res.importedCount).toBe(1);
      expect(res.skippedCount).toBe(1);
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.posSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entity: SyncEntity.TRANSACTION,
            direction: SyncDirection.PULL,
            successCount: 1,
          }),
        }),
      );
    });
  });

  describe('exportTransactions', () => {
    it('pushes paid orders to adapter and logs push', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          orderCode: 'MTW-261108-0001',
          paidAt: new Date(),
          createdAt: new Date(),
          paymentMethod: 'QRIS',
          subtotalAmount: 35000,
          discountAmount: 0,
          totalAmount: 35000,
          table: { label: 'Meja 1' },
          items: [{ itemNameSnapshot: 'Tuna Matah', quantity: 1, unitPrice: 35000, discountAmount: 0, lineTotal: 35000, menuItem: null }],
        },
      ]);

      mockAdapter.pushTransactions.mockResolvedValue({
        kind: 'file',
        fileName: 'export.csv',
        content: Buffer.from('test'),
        count: 1,
      });

      const res = await service.exportTransactions(outletId, undefined, undefined, userId);
      expect(res.kind).toBe('file');
      expect(mockPrisma.posSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: SyncDirection.PUSH,
            entity: SyncEntity.TRANSACTION,
            status: SyncStatus.SUCCESS,
          }),
        }),
      );
    });
  });
});
