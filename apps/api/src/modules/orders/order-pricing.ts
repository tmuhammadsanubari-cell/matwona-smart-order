import { ErrorCode } from 'shared';
import type { CreateOrderInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { MenuItem } from '../../generated/prisma/client.js';

type PricedMenuItem = Pick<MenuItem, 'id' | 'name' | 'price' | 'stock' | 'isAvailable' | 'isArchived'>;

export interface OrderLine {
  menuItemId: string;
  itemNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  note: string | null;
  fromRecommendation: boolean;
  promoId?: string | null;
}

export interface ApplicablePromo {
  id: string;
  title: string;
  discountType: 'PERCENT' | 'NOMINAL';
  discountValue: number;
  minPurchase: number;
  activeDays: number[];
  applicableMenuItemIds: string[]; // Kosong = berlaku untuk semua menu
  /** Kuota porsi maksimal (null/undefined = tanpa batas). */
  maxQuantity?: number | null;
  usedQuantity?: number;
}

export interface PricedOrder {
  lines: OrderLine[];
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  /** Jumlah yang dikurangkan dari stok, hanya untuk item yang stoknya dilacak. */
  stockDecrements: Map<string, number>;
  /** Tambahan pemakaian kuota per promoId (hanya untuk promo yang benar-benar dipakai). */
  promoUsageIncrements?: Map<string, number>;
}

/**
 * Hitung ulang pesanan dari data menu di database (NFR-007). Harga dari klien tidak pernah
 * dipakai; `expectedUnitPrice` hanya untuk mendeteksi PRICE_CHANGED.
 * Diskon promo (FR-020, BRU-11) diterapkan otomatis dari promo yang memenuhi syarat.
 */
export function priceOrder(
  requested: CreateOrderInput['items'],
  menuItems: PricedMenuItem[],
  activePromos: ApplicablePromo[] = [],
  currentDate = new Date(),
): PricedOrder {
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  // Satu menu bisa muncul di beberapa baris (catatan berbeda), stok dicek dari totalnya.
  const requiredQty = new Map<string, number>();
  for (const line of requested) {
    requiredQty.set(line.menuItemId, (requiredQty.get(line.menuItemId) ?? 0) + line.quantity);
  }

  const unavailable = [...requiredQty]
    .filter(([id, qty]) => {
      const item = byId.get(id);
      return !item || item.isArchived || !item.isAvailable || (item.stock !== null && item.stock < qty);
    })
    .map(([id]) => ({ menuItemId: id, name: byId.get(id)?.name ?? null }));
  if (unavailable.length) {
    throw new AppException(
      ErrorCode.ITEM_UNAVAILABLE,
      'Beberapa menu sudah habis. Silakan perbarui keranjang.',
      { items: unavailable },
    );
  }

  const changed = new Map<string, { menuItemId: string; name: string; expectedUnitPrice: number; unitPrice: number }>();
  for (const line of requested) {
    const item = byId.get(line.menuItemId)!;
    if (line.expectedUnitPrice !== undefined && line.expectedUnitPrice !== item.price) {
      changed.set(item.id, {
        menuItemId: item.id,
        name: item.name,
        expectedUnitPrice: line.expectedUnitPrice,
        unitPrice: item.price,
      });
    }
  }
  if (changed.size) {
    throw new AppException(
      ErrorCode.PRICE_CHANGED,
      'Harga beberapa menu sudah berubah. Silakan periksa keranjang.',
      { items: [...changed.values()] },
    );
  }

  // Hitung subtotal awal untuk pengecekan minPurchase promo
  const rawSubtotal = requested.reduce((sum, line) => {
    const item = byId.get(line.menuItemId)!;
    return sum + item.price * line.quantity;
  }, 0);

  // Filter promo yang aktif hari ini, memenuhi syarat minimal belanja, dan kuota masih cukup
  // 1 = Senin ... 7 = Minggu
  const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
  const remainingQuota = new Map<string, number>();
  const eligiblePromos = activePromos.filter((p) => {
    const dayMatches = p.activeDays.length === 0 || p.activeDays.includes(dayOfWeek);
    const minPurchaseMatches = rawSubtotal >= p.minPurchase;
    if (p.maxQuantity != null) {
      const remaining = p.maxQuantity - (p.usedQuantity ?? 0);
      if (remaining <= 0) return false;
      remainingQuota.set(p.id, remaining);
    }
    return dayMatches && minPurchaseMatches;
  });

  const promoUsageIncrements = new Map<string, number>();

  const lines: OrderLine[] = requested.map((line) => {
    const item = byId.get(line.menuItemId)!;
    let bestDiscount = 0;
    let bestPromoId: string | null = null;
    let bestDiscountedQty = 0;

    // Evaluasi semua promo yang berlaku untuk item ini, pilih diskon terbesar (BRU-11)
    for (const promo of eligiblePromos) {
      const appliesToItem =
        promo.applicableMenuItemIds.length === 0 || promo.applicableMenuItemIds.includes(item.id);
      if (!appliesToItem) continue;

      const capRemaining = remainingQuota.get(promo.id);
      const applicableQty = capRemaining === undefined ? line.quantity : Math.min(line.quantity, capRemaining);
      if (applicableQty <= 0) continue;

      let discountPerUnit = 0;
      if (promo.discountType === 'PERCENT') {
        discountPerUnit = Math.round((item.price * promo.discountValue) / 100);
      } else {
        discountPerUnit = promo.discountValue;
      }
      discountPerUnit = Math.min(item.price, Math.max(0, discountPerUnit));
      const totalLineDiscount = discountPerUnit * applicableQty;

      if (totalLineDiscount > bestDiscount) {
        bestDiscount = totalLineDiscount;
        bestPromoId = promo.id;
        bestDiscountedQty = applicableQty;
      }
    }

    if (bestPromoId && bestDiscountedQty > 0) {
      promoUsageIncrements.set(bestPromoId, (promoUsageIncrements.get(bestPromoId) ?? 0) + bestDiscountedQty);
      if (remainingQuota.has(bestPromoId)) {
        remainingQuota.set(bestPromoId, Math.max(0, remainingQuota.get(bestPromoId)! - bestDiscountedQty));
      }
    }

    const lineGross = line.quantity * item.price;
    const finalDiscount = Math.min(lineGross, bestDiscount);

    return {
      menuItemId: item.id,
      itemNameSnapshot: item.name,
      quantity: line.quantity,
      unitPrice: item.price,
      discountAmount: finalDiscount,
      lineTotal: lineGross - finalDiscount,
      note: line.note || null,
      fromRecommendation: line.fromRecommendation,
      promoId: bestPromoId,
    };
  });

  const subtotalAmount = rawSubtotal;
  const discountAmount = lines.reduce((sum, l) => sum + l.discountAmount, 0);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  const stockDecrements = new Map(
    [...requiredQty].filter(([id]) => byId.get(id)!.stock !== null),
  );

  return {
    lines,
    subtotalAmount,
    discountAmount,
    totalAmount,
    stockDecrements,
    ...(promoUsageIncrements.size > 0 ? { promoUsageIncrements } : {}),
  };
}
