import type { OrderStatus, PaymentStatus } from '../enums.js';
import type { StaffOrderDto } from './order.schema.js';

// Sumber: PRD 4.3 "Event WebSocket" (namespace /realtime) & 4.4.

export const REALTIME_NAMESPACE = '/realtime';

/**
 * Data `auth` saat handshake Socket.IO.
 * - Staf (kasir/admin): cukup kirim cookie sesi (`withCredentials: true`), atau `token` (access token) untuk klien non-browser.
 * - Pelanggan: `tableToken` + `orderCode` pesanan miliknya.
 */
export interface RealtimeHandshakeAuth {
  token?: string;
  tableToken?: string;
  orderCode?: string;
}

/** `order.created` → room kasir. Kartu pesanan lengkap. */
export type OrderCreatedEvent = StaffOrderDto;

/** `order.updated` → room kasir (dengan `order`) & room pesanan (tanpa `order`). */
export interface OrderUpdatedEvent {
  orderCode: string;
  status: OrderStatus;
  /** Hanya untuk room kasir. */
  order?: StaffOrderDto;
}

/** `payment.updated` → room kasir (dengan `order`) & room pesanan (tanpa `order`). */
export interface PaymentUpdatedEvent {
  orderCode: string;
  paymentStatus: PaymentStatus;
  /** Hanya untuk room kasir. */
  order?: StaffOrderDto;
}
