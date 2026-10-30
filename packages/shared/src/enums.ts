// Harus selaras dengan enum di apps/api/prisma/schema.prisma

export const UserRole = { ADMIN: 'ADMIN', CASHIER: 'CASHIER' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  SERVED: 'SERVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = { QRIS: 'QRIS', CASHIER: 'CASHIER' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Label status untuk UI pelanggan & kasir (bahasa Indonesia). */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Baru',
  CONFIRMED: 'Diterima kasir',
  PREPARING: 'Sedang disiapkan',
  SERVED: 'Disajikan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Belum bayar',
  PENDING: 'Menunggu pembayaran',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
};

export const SocketEvent = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  PAYMENT_UPDATED: 'payment.updated',
  MENU_UPDATED: 'menu.updated',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export const socketRoom = {
  cashier: (outletId: string) => `outlet:${outletId}:cashier`,
  menu: (outletId: string) => `outlet:${outletId}:menu`,
  order: (orderCode: string) => `order:${orderCode}`,
};
