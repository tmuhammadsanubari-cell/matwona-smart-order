import { z } from 'zod';

// Sumber: PRD 2.2.2 (acceptance criteria) & 4.3 (contoh POST /public/orders)

const indonesianPhone = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;

export const createOrderItemSchema = z.object({
  menuItemId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
  note: z.string().trim().max(120).optional(),
  fromRecommendation: z.boolean().default(false),
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

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'SERVED', 'COMPLETED']),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(200),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
