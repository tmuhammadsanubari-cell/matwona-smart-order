import { Body, Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import { ErrorCode, ORDER_HEADER, type ApiSuccess, type MidtransNotificationPayload, type PaymentInitiateResponse } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { Public } from '../../common/decorators/auth.decorators.js';
import { PaymentsService } from './payments.service.js';

@Controller()
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  /**
   * Membuat transaksi Snap QRIS (FR-005, S2-01).
   * Dipanggil oleh browser pelanggan dari meja bersangkutan.
   */
  @Public()
  @Post('public/orders/:code/pay')
  async initiatePay(
    @Param('code') orderCode: string,
    @Headers(ORDER_HEADER.TABLE_TOKEN) tableToken?: string,
  ): Promise<ApiSuccess<PaymentInitiateResponse>> {
    if (!tableToken) {
      throw new AppException(ErrorCode.INVALID_TABLE_TOKEN, 'Token meja diperlukan.');
    }
    const result = await this.paymentsService.createQrisCharge(orderCode, tableToken);
    return { success: true, data: result };
  }

  /**
   * Webhook notifikasi pembayaran dari Midtrans (FR-005, S2-02, NFR-008).
   * Terbuka untuk publik, diverifikasi menggunakan SHA-512 signature.
   */
  @Public()
  @Post('payments/midtrans/notification')
  async handleNotification(
    @Body() payload: MidtransNotificationPayload,
  ): Promise<ApiSuccess<{ success: boolean; status: string }>> {
    const result = await this.paymentsService.handleNotification(payload);
    return { success: true, data: result };
  }
}
