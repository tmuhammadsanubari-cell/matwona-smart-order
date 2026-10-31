import type { OrderStatus, PaymentStatus } from 'shared';
import type { BadgeTone } from '@/components/ui';

/** Warna badge status pesanan, mengikuti kolom dashboard kasir di desain (Baru merah, Diproses biru, dst.). */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  NEW: 'danger-solid',
  CONFIRMED: 'info',
  PREPARING: 'info',
  SERVED: 'primary',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

/** Warna badge status bayar: Belum bayar kuning, Menunggu abu-abu, Lunas hijau. */
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  UNPAID: 'warning',
  PENDING: 'neutral',
  PAID: 'success',
  FAILED: 'danger',
  EXPIRED: 'danger',
};
