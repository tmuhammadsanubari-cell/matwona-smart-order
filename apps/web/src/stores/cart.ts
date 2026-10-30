'use client';

import type { PublicMenuItem } from 'shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Keranjang pelanggan (FR-003; task S1-05). Disimpan per token meja di localStorage.
// Harga di sini hanya untuk tampilan; server selalu menghitung ulang (NFR-007).

export const MAX_QTY_PER_LINE = 20;
export const MAX_NOTE_LENGTH = 120;

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note?: string;
  fromRecommendation?: boolean;
}

interface CartState {
  tableToken: string | null;
  lines: CartLine[];
  bindTable: (token: string) => void;
  add: (line: Omit<CartLine, 'quantity'>, qty?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  setNote: (menuItemId: string, note: string) => void;
  /** Samakan nama & harga dengan menu terbaru agar yang dilihat pelanggan = harga sekarang. */
  syncWithMenu: (items: Map<string, PublicMenuItem>) => void;
  /** Terapkan harga baru dari server (error PRICE_CHANGED saat checkout). */
  updatePrices: (prices: { menuItemId: string; unitPrice: number }[]) => void;
  /** Hapus beberapa item sekaligus (error ITEM_UNAVAILABLE saat checkout). */
  remove: (menuItemIds: string[]) => void;
  clear: () => void;
}

const clampQty = (qty: number) => Math.min(MAX_QTY_PER_LINE, qty);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      tableToken: null,
      lines: [],
      bindTable: (token) => {
        if (get().tableToken !== token) set({ tableToken: token, lines: [] });
      },
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.menuItemId === line.menuItemId);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.menuItemId === line.menuItemId ? { ...l, quantity: clampQty(l.quantity + qty) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, quantity: clampQty(qty) }] };
        }),
      setQuantity: (menuItemId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.menuItemId !== menuItemId)
              : s.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: clampQty(quantity) } : l)),
        })),
      setNote: (menuItemId, note) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.menuItemId === menuItemId ? { ...l, note: note.slice(0, MAX_NOTE_LENGTH) || undefined } : l,
          ),
        })),
      syncWithMenu: (items) =>
        set((s) => ({
          lines: s.lines.map((l) => {
            const item = items.get(l.menuItemId);
            return item ? { ...l, name: item.name, unitPrice: item.price } : l;
          }),
        })),
      updatePrices: (prices) =>
        set((s) => {
          const byId = new Map(prices.map((p) => [p.menuItemId, p.unitPrice]));
          return { lines: s.lines.map((l) => (byId.has(l.menuItemId) ? { ...l, unitPrice: byId.get(l.menuItemId)! } : l)) };
        }),
      remove: (menuItemIds) => set((s) => ({ lines: s.lines.filter((l) => !menuItemIds.includes(l.menuItemId)) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'matwona-cart',
      storage: createJSONStorage(() => localStorage),
      // Dimuat manual setelah mount (loadCartForTable) agar render server & render pertama klien
      // sama → tidak ada hydration mismatch.
      skipHydration: true,
    },
  ),
);

/** Muat keranjang dari localStorage lalu ikat ke meja ini (keranjang meja lain dikosongkan). */
export async function loadCartForTable(token: string): Promise<void> {
  await useCart.persist.rehydrate();
  useCart.getState().bindTable(token);
}

export const cartSubtotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

export const cartItemCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

export interface CartSummary {
  subtotal: number;
  /** Diskon promo; 0 sampai modul promo tersedia (S3-08). */
  discount: number;
  total: number;
  itemCount: number;
  /** Baris yang menu-nya sudah habis/tidak ada; tidak dihitung dan harus dihapus sebelum lanjut. */
  unavailable: CartLine[];
}

/**
 * Ringkasan keranjang untuk tampilan (FR-003). Item yang habis/tidak ada di menu dikeluarkan dari total.
 * Angka akhir tetap dihitung ulang server saat pesanan dikirim (NFR-007).
 */
export function summarizeCart(lines: CartLine[], menuItems: Map<string, PublicMenuItem>): CartSummary {
  const isAvailable = (l: CartLine) => menuItems.get(l.menuItemId)?.isAvailable === true;
  const available = lines.filter(isAvailable);
  const subtotal = cartSubtotal(available);
  const discount = 0;
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    itemCount: cartItemCount(available),
    unavailable: lines.filter((l) => !isAvailable(l)),
  };
}
