'use client';

import { useState } from 'react';
import { formatRupiah } from 'shared';
import { Badge, Button, Textarea } from '@/components/ui';
import { QuantityStepper } from '@/components/menu/quantity-stepper';
import { MAX_NOTE_LENGTH, type CartLine } from '@/stores/cart';

export interface CartLineRowProps {
  line: CartLine;
  /** false = menu sudah habis / tidak ada; baris harus dihapus sebelum lanjut. */
  available: boolean;
  onQuantityChange: (quantity: number) => void;
  onNoteChange: (note: string) => void;
}

/** Satu baris keranjang: jumlah 1–20, catatan ≤ 120 karakter (FR-003). */
export function CartLineRow({ line, available, onQuantityChange, onNoteChange }: CartLineRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const note = line.note ?? '';

  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={available ? 'font-semibold text-ink' : 'font-semibold text-muted line-through'}>{line.name}</p>
          <p className="text-sm text-muted">
            {formatRupiah(line.unitPrice)} × {line.quantity}
          </p>
          {!available && (
            <Badge tone="danger" className="mt-1">
              Habis
            </Badge>
          )}
        </div>
        <p className="shrink-0 font-bold text-ink">{available ? formatRupiah(line.unitPrice * line.quantity) : '–'}</p>
      </div>

      {available ? (
        <div className="flex items-center justify-between gap-2">
          {!editingNote && !note ? (
            <Button variant="ghost" className="-ml-3" onClick={() => setEditingNote(true)}>
              + Catatan
            </Button>
          ) : (
            <span />
          )}
          <QuantityStepper itemName={line.name} quantity={line.quantity} onChange={onQuantityChange} />
        </div>
      ) : (
        <Button variant="secondary" className="self-end" onClick={() => onQuantityChange(0)}>
          Hapus dari keranjang
        </Button>
      )}

      {available && (editingNote || note) && (
        <Textarea
          label={`Catatan untuk ${line.name}`}
          hint={`${note.length}/${MAX_NOTE_LENGTH} karakter`}
          placeholder="mis. sambal dipisah"
          maxLength={MAX_NOTE_LENGTH}
          rows={2}
          autoFocus={editingNote}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      )}
    </li>
  );
}
