import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  orderCode: z.string().trim(),
});

export interface PaymentInitiateResponse {
  orderCode: string;
  snapToken: string;
  redirectUrl: string;
  expiresAt: string;
  qrImageUrl?: string;
  qrString?: string;
}

export const midtransNotificationSchema = z.object({
  order_id: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_status: z.string(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
  transaction_time: z.string().optional(),
  settlement_time: z.string().optional(),
});
export type MidtransNotificationPayload = z.infer<typeof midtransNotificationSchema>;
