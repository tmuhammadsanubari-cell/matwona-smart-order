'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Keranjang pelanggan (FR-003; task S1-05). Disimpan per token meja di localStorage.
// Harga di sini hanya untuk tampilan; server selalu menghitung ulang (NFR-007).

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
  clear: () => void;
}

const MAX_QTY = 20;

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
                l.menuItemId === line.menuItemId
                  ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + qty) }
                  : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, quantity: Math.min(MAX_QTY, qty) }] };
        }),
      setQuantity: (menuItemId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.menuItemId !== menuItemId)
              : s.lines.map((l) =>
                  l.menuItemId === menuItemId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l,
                ),
        })),
      setNote: (menuItemId, note) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, note: note.slice(0, 120) } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'matwona-cart', storage: createJSONStorage(() => localStorage) },
  ),
);

export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
