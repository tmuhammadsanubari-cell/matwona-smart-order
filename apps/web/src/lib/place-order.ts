import { ErrorCode } from 'shared';
import type { CreateOrderInput, PaymentMethod, PublicOrderDto } from 'shared';
import type { CartLine } from '@/stores/cart';
import { ApiClientError, apiFetch } from './api';

export interface PlaceOrderInput {
  tableToken: string;
  /** UUID yang sama dipakai ulang saat kirim ulang agar tidak membuat pesanan ganda (FR-004). */
  idempotencyKey: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
}

/** Payload POST /public/orders. `expectedUnitPrice` = harga yang dilihat pelanggan (deteksi PRICE_CHANGED). */
export function buildOrderPayload(input: PlaceOrderInput): CreateOrderInput {
  return {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone?.trim() || undefined,
    paymentMethod: input.paymentMethod,
    items: input.lines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      note: line.note?.trim() || undefined,
      fromRecommendation: line.fromRecommendation ?? false,
      expectedUnitPrice: line.unitPrice,
    })),
  };
}

/**
 * Kirim pesanan (FR-004). Bila server menjawab DUPLICATE_REQUEST (double-tap / kirim ulang setelah
 * koneksi putus) dengan pesanan awal, itu dianggap sukses. Error lain dilempar sebagai ApiClientError.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PublicOrderDto> {
  try {
    return await apiFetch<PublicOrderDto>('/public/orders', {
      method: 'POST',
      body: JSON.stringify(buildOrderPayload(input)),
      tableToken: input.tableToken,
      idempotencyKey: input.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.error.code === ErrorCode.DUPLICATE_REQUEST) {
      const original = (error.error.details as { order?: PublicOrderDto } | undefined)?.order;
      if (original) return original;
    }
    throw error;
  }
}
