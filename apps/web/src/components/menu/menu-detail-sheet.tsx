'use client';

import { useId, useState } from 'react';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { BottomSheet, Button, QuantityStepper, Textarea, type PhotoTone } from '@/components/ui';
import { MAX_NOTE_LENGTH, MAX_QTY_PER_LINE } from '@/stores/cart';
import { MenuPhoto } from './menu-item-card';

export interface MenuDetailSheetProps {
  /** null = sheet tertutup. */
  item: PublicMenuItem | null;
  photoTone: PhotoTone;
  /** Catatan yang sudah ada di keranjang untuk item ini (diisi ulang agar bisa diedit). */
  existingNote?: string;
  onClose: () => void;
  onAdd: (quantity: number, note: string) => void;
}

/**
 * Detail menu sebagai bottom sheet (FR-002, FR-003; desain C2): foto besar, deskripsi lengkap,
 * catatan ≤ 120 karakter, jumlah, dan tombol "Tambah ke Keranjang · total" yang selalu terlihat.
 */
export function MenuDetailSheet({ item, ...props }: MenuDetailSheetProps) {
  // key: jumlah & catatan mulai dari awal setiap kali item lain dibuka.
  return item ? <OpenSheet key={item.id} item={item} {...props} /> : null;
}

function OpenSheet({
  item,
  photoTone,
  existingNote,
  onClose,
  onAdd,
}: Omit<MenuDetailSheetProps, 'item'> & { item: PublicMenuItem }) {
  const formId = useId();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState(existingNote ?? '');
  const soldOut = !item.isAvailable;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={item.name}
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth disabled={soldOut}>
          {soldOut ? 'Habis' : `Tambah ke Keranjang · ${formatRupiah(item.price * quantity)}`}
        </Button>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4 pb-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!soldOut) onAdd(quantity, note.trim());
        }}
      >
        <MenuPhoto
          item={item}
          tone={soldOut ? 'none' : photoTone}
          width={448}
          // Tinggi tetap 176 px (bukan 4:3 penuh) agar catatan & jumlah terlihat tanpa scroll di HP 360 × 740.
          className="h-44 w-full rounded-card"
        />

        <div className="flex flex-col gap-2">
          <p className="text-xl font-extrabold text-primary">{formatRupiah(item.price)}</p>
          {item.description && <p className="text-sm leading-relaxed text-muted">{item.description}</p>}
          {soldOut && <p className="text-sm font-bold text-danger">Menu ini sedang habis.</p>}
        </div>

        {!soldOut && (
          <>
            <Textarea
              label="Catatan (opsional)"
              placeholder="Contoh: sambal dipisah, tidak pedas"
              maxLength={MAX_NOTE_LENGTH}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-ink">Jumlah</span>
              <QuantityStepper
                itemName={item.name}
                quantity={quantity}
                min={1}
                max={MAX_QTY_PER_LINE}
                onChange={setQuantity}
              />
            </div>
          </>
        )}
      </form>
    </BottomSheet>
  );
}
