'use client';

import { useState } from 'react';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { Button, cx, QuantityStepper, Textarea, type PhotoTone } from '@/components/ui';
import { MenuPhoto } from '@/components/menu/menu-item-card';
import { MAX_NOTE_LENGTH, MAX_QTY_PER_LINE, type CartLine } from '@/stores/cart';

export interface CartLineRowProps {
  line: CartLine;
  /** Menu terbaru untuk foto; undefined bila item sudah tidak ada di menu. */
  menuItem: PublicMenuItem | undefined;
  photoTone: PhotoTone;
  /** false = menu sudah habis / tidak ada; baris harus dihapus sebelum lanjut. */
  available: boolean;
  onQuantityChange: (quantity: number) => void;
  onNoteChange: (note: string) => void;
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

/** Satu baris keranjang (FR-003, desain C3): foto, nama, total baris, catatan ≤ 120 karakter, hapus, jumlah 1–20. */
export function CartLineRow({ line, menuItem, photoTone, available, onQuantityChange, onNoteChange }: CartLineRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const note = line.note ?? '';

  return (
    <li
      className={cx(
        'flex gap-3 border-b border-line p-3.5 last:border-b-0',
        !available && 'bg-danger-soft/40 shadow-[inset_3px_0_0_var(--color-danger)]',
      )}
    >
      {/* Disembunyikan di layar < 380 px agar catatan, hapus & stepper muat satu baris. */}
      <div className="hidden shrink-0 min-[380px]:block">
        <MenuPhoto
          item={{ name: line.name, imageUrl: menuItem?.imageUrl ?? null }}
          tone={available ? photoTone : 'none'}
          width={64}
          className={cx('size-16 rounded-control', !available && 'grayscale')}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cx('text-[15px] font-extrabold', available ? 'text-ink' : 'text-muted line-through')}>{line.name}</p>
          <p className="shrink-0 text-[15px] font-extrabold whitespace-nowrap text-ink">
            {available ? formatRupiah(line.unitPrice * line.quantity) : '–'}
          </p>
        </div>
        <p className="text-xs text-muted">
          {formatRupiah(line.unitPrice)} × {line.quantity}
        </p>
        {note && !editingNote && <p className="text-xs break-words text-muted italic">Catatan: {note}</p>}
        {!available && <p className="text-xs font-extrabold text-danger">Habis · tidak bisa dipesan</p>}

        {available && editingNote && (
          <div className="mt-1">
            <Textarea
              label={`Catatan untuk ${line.name}`}
              placeholder="Contoh: sambal dipisah, tidak pedas"
              maxLength={MAX_NOTE_LENGTH}
              rows={2}
              autoFocus
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {available ? (
            <Button variant="ghost" className="-ml-3 text-[13px]" onClick={() => setEditingNote((v) => !v)}>
              {editingNote ? 'Selesai' : note ? 'Edit catatan' : '+ Catatan'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Hapus ${line.name} dari keranjang`}
              onClick={() => onQuantityChange(0)}
              className={cx(
                'inline-flex size-11 items-center justify-center rounded-control hover:bg-line',
                available ? 'text-muted' : 'text-danger',
              )}
            >
              <TrashIcon />
            </button>
            {available && (
              <QuantityStepper
                itemName={line.name}
                quantity={line.quantity}
                max={MAX_QTY_PER_LINE}
                onChange={onQuantityChange}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
