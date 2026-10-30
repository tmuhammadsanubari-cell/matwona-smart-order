import { ErrorCode, OrderStatus, PaymentMethod, PaymentStatus } from 'shared';
import { AppException } from '../../common/app.exception.js';

/**
 * State machine status pesanan — satu-satunya sumber aturan transisi (PRD 4.2, tabel orders).
 *
 * NEW ──► CONFIRMED ──► PREPARING ──► SERVED ──► COMPLETED
 *  │          │
 *  └──────────┴──► CANCELLED
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SERVED'],
  SERVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface OrderStateSnapshot {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export function canTransition(order: OrderStateSnapshot, next: OrderStatus): boolean {
  try {
    assertTransition(order, next);
    return true;
  } catch {
    return false;
  }
}

export function assertTransition(order: OrderStateSnapshot, next: OrderStatus): void {
  if (!TRANSITIONS[order.status].includes(next)) {
    throw new AppException(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Status pesanan tidak bisa diubah dari ${order.status} ke ${next}.`,
      { from: order.status, to: next },
    );
  }

  // QRIS harus lunas sebelum dikonfirmasi kasir
  if (next === 'CONFIRMED' && order.paymentMethod === 'QRIS' && order.paymentStatus !== 'PAID') {
    throw new AppException(
      ErrorCode.PAYMENT_NOT_COMPLETED,
      'Pesanan QRIS belum lunas sehingga belum bisa diproses.',
    );
  }

  // Pesanan hanya bisa diselesaikan jika sudah lunas (termasuk bayar di kasir)
  if (next === 'COMPLETED' && order.paymentStatus !== 'PAID') {
    throw new AppException(
      ErrorCode.PAYMENT_NOT_COMPLETED,
      'Pesanan belum lunas. Tandai lunas terlebih dahulu.',
    );
  }
}

export function allowedNextStatuses(order: OrderStateSnapshot): OrderStatus[] {
  return TRANSITIONS[order.status].filter((next) => canTransition(order, next));
}
