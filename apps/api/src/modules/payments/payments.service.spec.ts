import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PaymentRecordStatus, PaymentStatus, OrderStatus } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PublicMenuService } from '../menu/public-menu.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import type { TablesService } from '../tables/tables.service.js';
import { PaymentsService } from './payments.service.js';

const OUTLET = { id: 'outlet-1', slug: 'matwona', name: 'Matwona' };
const TABLE = { id: 'table-1', label: 'A1', outletId: OUTLET.id };
const TUNA = 'item-tuna-1';

function mockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderCode: 'MTW-261119-0001',
    outletId: OUTLET.id,
    tableId: TABLE.id,
    customerName: 'Budi',
    customerPhone: '08123456789',
    status: OrderStatus.NEW,
    paymentMethod: 'QRIS',
    paymentStatus: PaymentStatus.PENDING,
    subtotalAmount: 35000,
    discountAmount: 0,
    totalAmount: 35000,
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
    cancelReason: null,
    table: { label: TABLE.label },
    items: [
      {
        id: 'oi-1',
        menuItemId: TUNA,
        itemNameSnapshot: 'Bakmie Tuna Lada Garam',
        quantity: 1,
        unitPrice: 35000,
        discountAmount: 0,
        lineTotal: 35000,
        note: null,
      },
    ],
    ...overrides,
  };
}

function setup(serverKey = 'SB-Mid-server-mock') {
  const orderData = mockOrder();

  const prisma = {
    order: {
      findFirst: vi.fn().mockResolvedValue(orderData),
      update: vi.fn(async ({ data }) => ({ ...orderData, ...data })),
    },
    payment: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'pay-1', snapToken: 'snap-token-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    menuItem: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };

  const config = {
    get: vi.fn((key: string, def?: unknown) => {
      if (key === 'MIDTRANS_SERVER_KEY') return serverKey;
      if (key === 'MIDTRANS_IS_PRODUCTION') return false;
      return def;
    }),
  };

  const tables = {
    resolveToken: vi.fn().mockResolvedValue({ table: TABLE, outlet: OUTLET }),
  };

  const realtime = {
    paymentUpdated: vi.fn(),
    orderUpdated: vi.fn(),
  };

  const menu = {
    invalidate: vi.fn(),
  };

  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    tables as unknown as TablesService,
    realtime as unknown as RealtimeService,
    menu as unknown as PublicMenuService,
  );

  return { prisma, config, tables, realtime, menu, service, orderData };
}

describe('PaymentsService (FR-005, NFR-008)', () => {
  describe('createQrisCharge', () => {
    it('membuat charge QRIS dan mengembalikan snapToken serta batas waktu 15 menit', async () => {
      const { service } = setup();
      const res = await service.createQrisCharge('MTW-261119-0001', 'valid-table-token');

      expect(res.orderCode).toBe('MTW-261119-0001');
      expect(res.snapToken).toBeDefined();
      expect(res.redirectUrl).toBeDefined();
      expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('memanggil Midtrans API secara nyata ketika Server Key valid', async () => {
      const { service } = setup('real-server-key-123');
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'midtrans-real-snap-token',
          redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/midtrans-real-snap-token',
        }),
      } as unknown as Response);

      const res = await service.createQrisCharge('MTW-261119-0001', 'valid-table-token');
      expect(fetchSpy).toHaveBeenCalled();
      expect(res.snapToken).toBe('midtrans-real-snap-token');
      fetchSpy.mockRestore();
    });

    it('menolak pesanan yang bukan metode QRIS', async () => {
      const { service, prisma } = setup();
      prisma.order.findFirst.mockResolvedValue(mockOrder({ paymentMethod: 'CASHIER' }));

      await expect(service.createQrisCharge('MTW-261119-0001', 'token')).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('menolak pesanan yang sudah lunas (PAID)', async () => {
      const { service, prisma } = setup();
      prisma.order.findFirst.mockResolvedValue(mockOrder({ paymentStatus: PaymentStatus.PAID }));

      await expect(service.createQrisCharge('MTW-261119-0001', 'token')).rejects.toMatchObject({
        code: ErrorCode.INVALID_STATUS_TRANSITION,
      });
    });

    it('menolak pesanan yang sudah dibatalkan (CANCELLED)', async () => {
      const { service, prisma } = setup();
      prisma.order.findFirst.mockResolvedValue(mockOrder({ status: OrderStatus.CANCELLED }));

      await expect(service.createQrisCharge('MTW-261119-0001', 'token')).rejects.toMatchObject({
        code: ErrorCode.INVALID_STATUS_TRANSITION,
      });
    });
  });

  describe('verifySignature', () => {
    it('memverifikasi SHA-512 signature secara akurat', () => {
      const serverKey = 'my-secret-key';
      const { service } = setup(serverKey);

      const orderId = 'MTW-261119-0001';
      const statusCode = '200';
      const grossAmount = '35000.00';
      const validHash = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      expect(service.verifySignature(orderId, statusCode, grossAmount, validHash)).toBe(true);
      expect(service.verifySignature(orderId, statusCode, grossAmount, 'invalid-hash')).toBe(false);
    });
  });

  describe('handleNotification (Webhook Midtrans)', () => {
    it('settlement / capture menandai pesanan PAID dan memancarkan realtime', async () => {
      const serverKey = 'secret-key';
      const { service, realtime, prisma } = setup(serverKey);

      const orderId = 'MTW-261119-0001';
      const statusCode = '200';
      const grossAmount = '35000.00';
      const signatureKey = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      const res = await service.handleNotification({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_status: 'settlement',
      });

      expect(res.status).toBe('PAID');
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentRecordStatus.PAID }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentStatus: PaymentStatus.PAID }),
        }),
      );
      expect(realtime.paymentUpdated).toHaveBeenCalled();
    });

    it('idempoten: tidak memproses ulang pesanan yang sudah PAID', async () => {
      const serverKey = 'secret-key';
      const { service, prisma, realtime } = setup(serverKey);

      prisma.order.findFirst.mockResolvedValue(mockOrder({ paymentStatus: PaymentStatus.PAID }));

      const orderId = 'MTW-261119-0001';
      const statusCode = '200';
      const grossAmount = '35000.00';
      const signatureKey = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      const res = await service.handleNotification({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_status: 'settlement',
      });

      expect(res.status).toBe('ALREADY_PAID');
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(realtime.paymentUpdated).not.toHaveBeenCalled();
    });

    it('expire membatalkan pesanan, mengembalikan stok, dan memancarkan realtime', async () => {
      const serverKey = 'secret-key';
      const { service, prisma, realtime, menu } = setup(serverKey);

      const orderId = 'MTW-261119-0001';
      const statusCode = '200';
      const grossAmount = '35000.00';
      const signatureKey = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      const res = await service.handleNotification({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_status: 'expire',
      });

      expect(res.status).toBe('EXPIRED');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.EXPIRED,
            status: OrderStatus.CANCELLED,
          }),
        }),
      );
      expect(prisma.menuItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: TUNA }),
          data: { stock: { increment: 1 } },
        }),
      );
      expect(menu.invalidate).toHaveBeenCalledWith(OUTLET.id);
      expect(realtime.paymentUpdated).toHaveBeenCalled();
      expect(realtime.orderUpdated).toHaveBeenCalled();
    });
  });
});
