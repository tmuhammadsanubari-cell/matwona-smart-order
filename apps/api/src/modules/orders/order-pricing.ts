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
}

export interface PricedOrder {
  lines: OrderLine[];
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  /** Jumlah yang dikurangkan dari stok, hanya untuk item yang stoknya dilacak. */
  stockDecrements: Map<string, number>;
}

/**
 * Hitung ulang pesanan dari data menu di database (NFR-007). Harga dari klien tidak pernah
 * dipakai; `expectedUnitPrice` hanya untuk mendeteksi PRICE_CHANGED.
 * Diskon promo (FR-020) belum diterapkan sampai modul promo tersedia (S3-08).
 */
export function priceOrder(requested: CreateOrderInput['items'], menuItems: PricedMenuItem[]): PricedOrder {
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

  const lines: OrderLine[] = requested.map((line) => {
    const item = byId.get(line.menuItemId)!;
    const discountAmount = 0;
    return {
      menuItemId: item.id,
      itemNameSnapshot: item.name,
      quantity: line.quantity,
      unitPrice: item.price,
      discountAmount,
      lineTotal: line.quantity * item.price - discountAmount,
      note: line.note || null,
      fromRecommendation: line.fromRecommendation,
    };
  });

  const subtotalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const discountAmount = lines.reduce((sum, l) => sum + l.discountAmount, 0);

  const stockDecrements = new Map(
    [...requiredQty].filter(([id]) => byId.get(id)!.stock !== null),
  );

  return { lines, subtotalAmount, discountAmount, totalAmount: subtotalAmount - discountAmount, stockDecrements };
}
