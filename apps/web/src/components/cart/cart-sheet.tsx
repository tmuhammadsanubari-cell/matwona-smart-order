'use client';

import Link from 'next/link';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { BottomSheet, Button, buttonClassName, Card, EmptyState, type PhotoTone } from '@/components/ui';
import { summarizeCart, useCart } from '@/stores/cart';
import { CartLineRow } from './cart-line-row';

export interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  tableLabel: string;
  /** Menu terbaru (id → item) untuk menandai item yang sudah habis. */
  menuItems: Map<string, PublicMenuItem>;
  /** Warna placeholder foto per item. */
  photoTones: Map<string, PhotoTone>;
  checkoutHref: string;
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5h.01" />
    </svg>
  );
}

/** Keranjang sebagai bottom sheet dengan total yang selalu terlihat (FR-003, PRD 4.9; isi mengikuti desain C3). */
export function CartSheet({ open, onClose, tableLabel, menuItems, photoTones, checkoutHref }: CartSheetProps) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const setNote = useCart((s) => s.setNote);
  const summary = summarizeCart(lines, menuItems);
  const canCheckout = summary.itemCount > 0 && summary.unavailable.length === 0;

  const footer =
    lines.length === 0 ? undefined : (
      <div className="flex flex-col gap-3">
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-bold text-ink">{formatRupiah(summary.subtotal)}</dd>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Diskon promo</dt>
              <dd className="font-bold text-primary">−{formatRupiah(summary.discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <dt className="text-base font-extrabold text-ink">Total</dt>
            <dd className="text-2xl font-extrabold text-ink">{formatRupiah(summary.total)}</dd>
          </div>
        </dl>
        {canCheckout ? (
          <Link href={checkoutHref} className={buttonClassName({ size: 'lg', fullWidth: true })}>
            Lanjut ke Pembayaran
          </Link>
        ) : (
          <Button size="lg" fullWidth disabled>
            Lanjut ke Pembayaran
          </Button>
        )}
      </div>
    );

  return (
    <BottomSheet open={open} onClose={onClose} title={`Keranjang · Meja ${tableLabel}`} footer={footer}>
      {lines.length === 0 ? (
        <EmptyState
          title="Keranjangmu masih kosong"
          description="Yuk pilih tuna atau ayam kampung favoritmu."
          action={
            <Button variant="secondary" onClick={onClose}>
              Lihat menu
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {summary.unavailable.length > 0 && (
            <p
              role="alert"
              className="flex gap-2.5 rounded-control border border-danger/30 bg-danger-soft p-3 text-sm leading-snug font-semibold text-danger-strong"
            >
              <AlertIcon />
              <span>
                {summary.unavailable.map((l) => l.name).join(', ')} baru saja habis. Hapus dari keranjang untuk lanjut.
              </span>
            </p>
          )}
          <Card padding="none" className="overflow-hidden">
            <ul>
              {lines.map((line) => (
                <CartLineRow
                  key={line.menuItemId}
                  line={line}
                  menuItem={menuItems.get(line.menuItemId)}
                  photoTone={photoTones.get(line.menuItemId) ?? 'none'}
                  available={menuItems.get(line.menuItemId)?.isAvailable === true}
                  onQuantityChange={(qty) => setQuantity(line.menuItemId, qty)}
                  onNoteChange={(note) => setNote(line.menuItemId, note)}
                />
              ))}
            </ul>
          </Card>
        </div>
      )}
    </BottomSheet>
  );
}
