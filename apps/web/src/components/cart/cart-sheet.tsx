'use client';

import Link from 'next/link';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { BottomSheet, Button, buttonClassName } from '@/components/ui';
import { summarizeCart, useCart } from '@/stores/cart';
import { CartLineRow } from './cart-line-row';

export interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  tableLabel: string;
  /** Menu terbaru (id → item) untuk menandai item yang sudah habis. */
  menuItems: Map<string, PublicMenuItem>;
  checkoutHref: string;
}

/** Keranjang sebagai bottom sheet dengan ringkasan total yang selalu terlihat (FR-003, PRD 4.9). */
export function CartSheet({ open, onClose, tableLabel, menuItems, checkoutHref }: CartSheetProps) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const setNote = useCart((s) => s.setNote);
  const summary = summarizeCart(lines, menuItems);
  const canCheckout = summary.itemCount > 0 && summary.unavailable.length === 0;

  const footer =
    lines.length === 0 ? undefined : (
      <div className="flex flex-col gap-3">
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Subtotal</dt>
            <dd>{formatRupiah(summary.subtotal)}</dd>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between text-primary">
              <dt>Diskon promo</dt>
              <dd>−{formatRupiah(summary.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-ink">
            <dt>Total</dt>
            <dd>{formatRupiah(summary.total)}</dd>
          </div>
        </dl>
        {summary.unavailable.length > 0 && (
          <p role="alert" className="text-sm text-danger">
            Hapus menu yang habis untuk melanjutkan.
          </p>
        )}
        {canCheckout ? (
          <Link href={checkoutHref} className={buttonClassName({ size: 'lg', fullWidth: true })}>
            Lanjut ke pembayaran
          </Link>
        ) : (
          <Button size="lg" fullWidth disabled>
            Lanjut ke pembayaran
          </Button>
        )}
      </div>
    );

  return (
    <BottomSheet open={open} onClose={onClose} title={`Keranjang · Meja ${tableLabel}`} footer={footer}>
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-ink">Keranjangmu masih kosong.</p>
          <Button variant="secondary" onClick={onClose}>
            Lihat menu
          </Button>
        </div>
      ) : (
        <ul>
          {lines.map((line) => (
            <CartLineRow
              key={line.menuItemId}
              line={line}
              available={menuItems.get(line.menuItemId)?.isAvailable === true}
              onQuantityChange={(qty) => setQuantity(line.menuItemId, qty)}
              onNoteChange={(note) => setNote(line.menuItemId, note)}
            />
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
