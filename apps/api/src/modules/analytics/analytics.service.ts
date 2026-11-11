import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AnalyticsSummary {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  digitalSharePercent: number;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
  topItems: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number; label: string }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(outletId: string, fromStr?: string, toStr?: string): Promise<AnalyticsSummary> {
    const now = new Date();
    const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : now;
    const from = fromStr
      ? new Date(`${fromStr}T00:00:00.000Z`)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let digitalOrdersCount = 0;
    const dateMap = new Map<string, { revenue: number; orders: number }>();
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const hourMap = new Map<number, number>();
    const methodMap = new Map<string, { count: number; total: number }>();

    for (let h = 10; h <= 21; h++) {
      hourMap.set(h, 0);
    }

    for (const order of orders) {
      const isPaid = order.paymentStatus === 'PAID';
      if (isPaid) {
        totalRevenue += order.totalAmount;
      }

      if (order.source === 'DIGITAL') {
        digitalOrdersCount++;
      }

      // Date trend
      const dateKey = order.createdAt.toISOString().slice(0, 10);
      const existingDate = dateMap.get(dateKey) ?? { revenue: 0, orders: 0 };
      existingDate.orders++;
      if (isPaid) existingDate.revenue += order.totalAmount;
      dateMap.set(dateKey, existingDate);

      // Hourly (WIB = UTC+7)
      const wibHour = (order.createdAt.getUTCHours() + 7) % 24;
      hourMap.set(wibHour, (hourMap.get(wibHour) ?? 0) + 1);

      // Payment method
      const method = order.paymentMethod;
      const m = methodMap.get(method) ?? { count: 0, total: 0 };
      m.count++;
      if (isPaid) m.total += order.totalAmount;
      methodMap.set(method, m);

      // Items
      for (const item of order.items) {
        const existingItem = itemMap.get(item.menuItemId) ?? {
          name: item.itemNameSnapshot,
          quantity: 0,
          revenue: 0,
        };
        existingItem.quantity += item.quantity;
        if (isPaid) existingItem.revenue += item.lineTotal;
        itemMap.set(item.menuItemId, existingItem);
      }
    }

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const digitalSharePercent = totalOrders > 0 ? Math.round((digitalOrdersCount / totalOrders) * 100) : 100;

    const salesTrend = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      orders: val.orders,
    }));

    const topItems = Array.from(itemMap.entries())
      .map(([id, val]) => ({
        id,
        name: val.name,
        quantity: val.quantity,
        revenue: val.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const peakHours = Array.from(hourMap.entries())
      .map(([hour, orderCount]) => ({
        hour,
        orderCount,
        label: `${String(hour).padStart(2, '0')}:00`,
      }))
      .sort((a, b) => a.hour - b.hour);

    const paymentMethods = Array.from(methodMap.entries()).map(([method, val]) => ({
      method,
      count: val.count,
      total: val.total,
    }));

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      totalRevenue,
      totalOrders,
      averageOrderValue,
      digitalSharePercent,
      salesTrend,
      topItems,
      peakHours,
      paymentMethods,
    };
  }
}
