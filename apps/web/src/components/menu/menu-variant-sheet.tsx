'use client';

import { useId, useState } from 'react';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { Badge, BottomSheet, Button, cx, QuantityStepper, Textarea, type PhotoTone } from '@/components/ui';
import { variantOptionLabel } from '@/lib/menu-groups';
import { MAX_NOTE_LENGTH, MAX_QTY_PER_LINE } from '@/stores/cart';
import { MenuPhoto } from './menu-item-card';

export interface MenuVariantGroupSelection {
  name: string;
  description: string | null;
  imageUrl: string | null;
  items: PublicMenuItem[];
}

export interface MenuVariantSheetProps {
  group: MenuVariantGroupSelection | null;
  photoTone: PhotoTone;
  onClose: () => void;
  onAdd: (item: PublicMenuItem, quantity: number, note: string) => void;
}

/**
 * Bottom sheet pemilih varian rasa/level pedas (sesuai masukan owner Matwona: pilih sambal/porsi di pop-up
 * agar menu tidak terlalu panjang, sembari tetap menampilkan stok per varian secara akurat).
 */
export function MenuVariantSheet({ group, ...props }: MenuVariantSheetProps) {
  return group ? <OpenVariantSheet key={group.name} group={group} {...props} /> : null;
}

function OpenVariantSheet({
  group,
  photoTone,
  onClose,
  onAdd,
}: Omit<MenuVariantSheetProps, 'group'> & { group: MenuVariantGroupSelection }) {
  const formId = useId();
  const firstAvailable = group.items.find((i) => i.isAvailable) ?? group.items[0]!;
  const [selectedId, setSelectedId] = useState(firstAvailable.id);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const selected = group.items.find((i) => i.id === selectedId) ?? firstAvailable;
  const soldOut = !selected.isAvailable;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={group.name}
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth disabled={soldOut}>
          {soldOut ? 'Varian Habis' : `Tambah ke Keranjang · ${formatRupiah(selected.price * quantity)}`}
        </Button>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4 pb-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!soldOut) onAdd(selected, quantity, note.trim());
        }}
      >
        <MenuPhoto
          item={{ name: selected.name, imageUrl: selected.imageUrl ?? group.imageUrl }}
          tone={soldOut ? 'none' : photoTone}
          width={448}
          className="h-40 w-full rounded-card"
        />

        {(selected.description || group.description) && (
          <p className="text-sm leading-relaxed text-muted">{selected.description ?? group.description}</p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-extrabold text-ink">Pilih Varian & Level Pedas</legend>
          {group.items.map((variant) => {
            const active = variant.id === selected.id;
            const variantSoldOut = !variant.isAvailable;
            const lowStock = variant.isAvailable && typeof variant.stock === 'number' && variant.stock <= 5;
            return (
              <label
                key={variant.id}
                className={cx(
                  'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-control border-[1.5px] px-3.5 py-2.5 transition-colors',
                  variantSoldOut && 'cursor-not-allowed border-line bg-neutral-soft/60 opacity-70',
                  active && !variantSoldOut && 'border-2 border-primary bg-primary-soft/40',
                  !active && !variantSoldOut && 'border-line bg-surface hover:border-primary/50',
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="radio"
                    name="variantChoice"
                    value={variant.id}
                    checked={active}
                    disabled={variantSoldOut}
                    onChange={() => setSelectedId(variant.id)}
                    className="size-4.5 shrink-0 accent-primary"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold text-ink">{variantOptionLabel(variant)}</span>
                    {lowStock && (
                      <span className="text-[11px] font-bold text-warning-strong">
                        Stok tinggal {variant.stock}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {variantSoldOut ? (
                    <Badge tone="danger-solid">Habis</Badge>
                  ) : (
                    <span className="text-sm font-extrabold text-primary">{formatRupiah(variant.price)}</span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>

        {!soldOut && (
          <>
            <Textarea
              label="Catatan (opsional)"
              placeholder="Contoh: sambal dipisah, tidak pakai kremesan"
              maxLength={MAX_NOTE_LENGTH}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-ink">Jumlah</span>
              <QuantityStepper
                itemName={selected.name}
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
