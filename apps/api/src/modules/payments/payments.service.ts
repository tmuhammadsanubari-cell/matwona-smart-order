import crypto from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode, type MidtransNotificationPayload, type PaymentInitiateResponse } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PaymentProvider, PaymentRecordStatus, PaymentStatus, OrderStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { orderInclude, toStaffOrderDto, type OrderWithItems } from '../orders/order.mapper.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { TablesService } from '../tables/tables.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(TablesService) private readonly tables: TablesService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
    @Inject(PublicMenuService) private readonly menu: PublicMenuService,
  ) {}

  /**
   * Membuat transaksi Snap QRIS (FR-005, S2-01).
   * Expiry 15 menit, verifikasi token meja, dan kembalikan token Snap.
   */
  async createQrisCharge(orderCode: string, tableToken: string): Promise<PaymentInitiateResponse> {
    const { table, outlet } = await this.tables.resolveToken(tableToken);

    const order = await this.prisma.order.findFirst({
      where: { orderCode, outletId: outlet.id, tableId: table.id },
      include: orderInclude,
    });

    if (!order) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');
    }

    if (order.paymentMethod !== 'QRIS') {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Metode pembayaran pesanan ini bukan QRIS.');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, 'Pesanan sudah lunas.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, 'Pesanan sudah dibatalkan.');
    }

    // Periksa apakah pembayaran yang aktif masih berlaku
    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentRecordStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    if (existing?.snapToken && existing.expiresAt && existing.expiresAt > now && (existing.rawResponse as Record<string, unknown> | null)?.qrImageUrl) {
      const raw = existing.rawResponse as Record<string, unknown>;
      return {
        orderCode: order.orderCode,
        snapToken: existing.snapToken,
        redirectUrl: (raw?.redirectUrl as string) ?? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${existing.snapToken}`,
        expiresAt: existing.expiresAt.toISOString(),
        qrImageUrl: raw?.qrImageUrl as string | undefined,
        qrString: raw?.qrString as string | undefined,
      };
    }

    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY', '');
    const isProduction = String(this.config.get('MIDTRANS_IS_PRODUCTION', 'false')).toLowerCase() === 'true';

    let snapToken = '';
    let redirectUrl = '';
    let qrImageUrl: string | undefined;
    let qrString: string | undefined;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit (BRU-07)

    // Jika environment key belum diisi atau masih placeholder test
    if (!serverKey || serverKey.includes('xxxx') || serverKey.includes('mock')) {
      this.logger.warn('MIDTRANS_SERVER_KEY tidak valid/placeholder; menggunakan simulasi Snap sandbox.');
      snapToken = `mock-snap-${order.orderCode}-${Date.now()}`;
      redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
    } else {
      try {
        const chargeBaseUrl = isProduction
          ? 'https://api.midtrans.com/v2/charge'
          : 'https://api.sandbox.midtrans.com/v2/charge';

        const payload = {
          payment_type: 'qris',
          transaction_details: {
            order_id: order.orderCode,
            gross_amount: order.totalAmount,
          },
          customer_details: {
            first_name: order.customerName,
            phone: order.customerPhone || undefined,
          },
          qris: {
            acquirer: 'gopay',
          },
        };

        const res = await fetch(chargeBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.text();
          this.logger.error(`Midtrans API error: ${res.status} ${errBody}`);
          throw new AppException(ErrorCode.PAYMENT_PROVIDER_ERROR, 'Gagal menghubungi penyedia pembayaran.');
        }

        const data = (await res.json()) as {
          transaction_id?: string;
          token?: string;
          redirect_url?: string;
          actions?: Array<{ name: string; url: string }>;
          qr_string?: string;
        };

        const actions = Array.isArray(data.actions) ? data.actions : [];
        const qrAction = actions.find((a) => a.name === 'generate-qr-code');
        qrImageUrl = qrAction?.url;
        qrString = data.qr_string;
        snapToken = data.transaction_id ?? data.token ?? `charge-${order.orderCode}`;
        redirectUrl = data.redirect_url ?? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
      } catch (err: unknown) {
        if (err instanceof AppException) throw err;
        this.logger.error(`Error requesting Midtrans QRIS charge: ${err}`);
        throw new AppException(ErrorCode.PAYMENT_PROVIDER_ERROR, 'Gagal membuat sesi pembayaran QRIS.');
      }
    }

    // Catat / perbarui riwayat transaksi payment
    await this.prisma.payment.upsert({
      where: { providerRef: order.orderCode },
      create: {
        orderId: order.id,
        provider: PaymentProvider.MIDTRANS,
        providerRef: order.orderCode,
        snapToken,
        status: PaymentRecordStatus.PENDING,
        amount: order.totalAmount,
        expiresAt,
        rawResponse: {
          qrImageUrl,
          qrString,
          snapToken,
          redirectUrl,
        },
      },
      update: {
        snapToken,
        status: PaymentRecordStatus.PENDING,
        amount: order.totalAmount,
        expiresAt,
        rawResponse: {
          qrImageUrl,
          qrString,
          snapToken,
          redirectUrl,
        },
      },
    });

    return {
      orderCode: order.orderCode,
      snapToken,
      redirectUrl,
      expiresAt: expiresAt.toISOString(),
      qrImageUrl,
      qrString,
    };
  }

  /**
   * Verifikasi signature SHA-512 webhook Midtrans (NFR-008).
   * SHA512(order_id + status_code + gross_amount + ServerKey)
   */
  verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY', '');
    this.logger.log(`Using serverKey: [${serverKey}] (len=${serverKey.length})`);
    if (!serverKey || serverKey.startsWith('SB-Mid-server-xxx')) {
      return true; // Bypass signature verification in dummy mock mode
    }
    const hash = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');
    return hash === signatureKey;
  }

  /**
   * Menangani notifikasi webhook Midtrans (S2-02, NFR-008).
   * Idempoten, perbarui status pesanan, kembalikan stok saat kedaluwarsa, pancarkan realtime.
   */
  async handleNotification(payload: MidtransNotificationPayload): Promise<{ success: boolean; status: string }> {
    const isValid = this.verifySignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key,
    );

    if (!isValid) {
      this.logger.warn(`Signature webhook Midtrans tidak valid untuk order_id: ${payload.order_id}`);
      throw new AppException(ErrorCode.FORBIDDEN, 'Signature Midtrans tidak valid.');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderCode: payload.order_id },
      include: orderInclude,
    });

    if (!order) {
      this.logger.warn(`Pesanan dengan orderCode ${payload.order_id} tidak ditemukan.`);
      throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');
    }

    // Idempotensi: Jika pesanan sudah lunas, jangan proses ulang
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { success: true, status: 'ALREADY_PAID' };
    }

    const txStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    if (txStatus === 'settlement' || (txStatus === 'capture' && fraudStatus !== 'challenge')) {
      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id, providerRef: order.orderCode },
          data: {
            status: PaymentRecordStatus.PAID,
            rawResponse: JSON.parse(JSON.stringify(payload)),
          },
        });

        return tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
          include: orderInclude,
        });
      });

      this.realtime.paymentUpdated(order.outletId, toStaffOrderDto(updatedOrder));
      return { success: true, status: 'PAID' };
    }

    if (txStatus === 'expire') {
      const { updatedOrder, stockRestored } = await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id, providerRef: order.orderCode },
          data: {
            status: PaymentRecordStatus.EXPIRED,
            rawResponse: JSON.parse(JSON.stringify(payload)),
          },
        });

        const stockRestored = await this.restoreOrderStock(tx, order);

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.EXPIRED,
            status: OrderStatus.CANCELLED,
            cancelReason: 'Batas waktu pembayaran QRIS 15 menit berakhir.',
          },
          include: orderInclude,
        });

        return { updatedOrder, stockRestored };
      });

      if (stockRestored) {
        await this.menu.invalidate(order.outletId);
      }

      this.realtime.paymentUpdated(order.outletId, toStaffOrderDto(updatedOrder));
      this.realtime.orderUpdated(order.outletId, toStaffOrderDto(updatedOrder));
      return { success: true, status: 'EXPIRED' };
    }

    if (txStatus === 'cancel' || txStatus === 'deny') {
      const { updatedOrder, stockRestored } = await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id, providerRef: order.orderCode },
          data: {
            status: PaymentRecordStatus.FAILED,
            rawResponse: JSON.parse(JSON.stringify(payload)),
          },
        });

        const stockRestored = await this.restoreOrderStock(tx, order);

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: OrderStatus.CANCELLED,
            cancelReason: 'Pembayaran QRIS dibatalkan atau ditolak.',
          },
          include: orderInclude,
        });

        return { updatedOrder, stockRestored };
      });

      if (stockRestored) {
        await this.menu.invalidate(order.outletId);
      }

      this.realtime.paymentUpdated(order.outletId, toStaffOrderDto(updatedOrder));
      this.realtime.orderUpdated(order.outletId, toStaffOrderDto(updatedOrder));
      return { success: true, status: 'FAILED' };
    }

    return { success: true, status: txStatus };
  }

  private async restoreOrderStock(tx: Prisma.TransactionClient, order: OrderWithItems): Promise<boolean> {
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      if (item.menuItemId) {
        quantities.set(item.menuItemId, (quantities.get(item.menuItemId) ?? 0) + item.quantity);
      }
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
}
