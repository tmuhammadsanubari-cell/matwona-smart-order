import { z } from 'zod';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../enums.js';

// Sumber: PRD 2.2.2 (acceptance criteria) & 4.3 (contoh POST /public/orders)

const indonesianPhone = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;

/** Header request POST /public/orders (huruf kecil, sesuai `req.headers`). */
export const ORDER_HEADER = {
  TABLE_TOKEN: 'x-table-token',
  IDEMPOTENCY_KEY: 'idempotency-key',
} as const;

export const idempotencyKeySchema = z.uuid('Idempotency-Key harus berupa UUID');

export const createOrderItemSchema = z.object({
  menuItemId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
  note: z.string().trim().max(120).optional(),
  fromRecommendation: z.boolean().default(false),
  /**
   * Harga yang dilihat pelanggan di keranjang. Hanya dipakai untuk mendeteksi PRICE_CHANGED;
   * total selalu dihitung dari harga database (NFR-007).
   */
  expectedUnitPrice: z.number().int().nonnegative().optional(),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(50),
  customerPhone: z
    .string()
    .trim()
    .regex(indonesianPhone, 'Format no. HP tidak valid')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  paymentMethod: z.enum(['QRIS', 'CASHIER']),
  items: z.array(createOrderItemSchema).min(1, 'Keranjang masih kosong').max(50),
  recommendationSessionId: z.string().max(40).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface PublicOrderItemDto {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  note: string | null;
}

/** Response POST /public/orders (PRD 4.3). Nominal dalam integer Rupiah. */
export interface PublicOrderDto {
  orderCode: string;
  /** Label meja, mis. "A3". */
  table: string;
  customerName: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  items: PublicOrderItemDto[];
  createdAt: string;
}

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'SERVED', 'COMPLETED']),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(200),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
