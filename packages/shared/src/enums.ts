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
  STOCK_REMINDER: 'stock.reminder',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export const OrderSource = {
  DIGITAL: 'DIGITAL',
  OLSERA_IMPORT: 'OLSERA_IMPORT',
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const RecoSource = {
  CART_ASSOCIATION: 'CART_ASSOCIATION',
  POPULAR_NOW: 'POPULAR_NOW',
} as const;
export type RecoSource = (typeof RecoSource)[keyof typeof RecoSource];

export const RecoEventType = {
  IMPRESSION: 'IMPRESSION',
  CLICK: 'CLICK',
  ADD_TO_CART: 'ADD_TO_CART',
  PURCHASED: 'PURCHASED',
} as const;
export type RecoEventType = (typeof RecoEventType)[keyof typeof RecoEventType];

export const socketRoom = {
  cashier: (outletId: string) => `outlet:${outletId}:cashier`,
  menu: (outletId: string) => `outlet:${outletId}:menu`,
  order: (orderCode: string) => `order:${orderCode}`,
};
