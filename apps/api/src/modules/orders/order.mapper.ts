import type { PublicOrderDto, StaffOrderDto } from 'shared';
import type { Order, OrderItem, Prisma } from '../../generated/prisma/client.js';
import { allowedNextStatuses, canMarkPaid } from './order-status.machine.js';

/** Relasi yang selalu dimuat untuk membentuk DTO pesanan. */
export const orderInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  table: { select: { label: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Order & { items: OrderItem[]; table: { label: string } | null };

export const toPublicOrderDto = (order: OrderWithItems): PublicOrderDto => ({
  orderCode: order.orderCode,
  table: order.table?.label ?? '',
  customerName: order.customerName,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  subtotalAmount: order.subtotalAmount,
  discountAmount: order.discountAmount,
  totalAmount: order.totalAmount,
  items: order.items.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.itemNameSnapshot,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    lineTotal: item.lineTotal,
    note: item.note,
  })),
  createdAt: order.createdAt.toISOString(),
});

export const toStaffOrderDto = (order: OrderWithItems): StaffOrderDto => ({
  ...toPublicOrderDto(order),
  id: order.id,
  customerPhone: order.customerPhone,
  cancelReason: order.cancelReason,
  paidAt: order.paidAt?.toISOString() ?? null,
  updatedAt: order.updatedAt.toISOString(),
  allowedNextStatuses: allowedNextStatuses(order),
  canMarkPaid: canMarkPaid(order),
});
