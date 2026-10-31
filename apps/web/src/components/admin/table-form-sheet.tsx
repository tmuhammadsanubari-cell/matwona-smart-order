'use client';

import { useState } from 'react';
import { createTablesSchema, updateTableSchema } from 'shared';
import type { CreateTablesInput, DiningTableDto, UpdateTableInput } from 'shared';
import { BottomSheet, Button, Input } from '@/components/ui';
import { parseTableLabels } from '@/lib/table-labels';

export interface TableFormSheetProps {
  /** null = tambah meja. */
  table: DiningTableDto | null;
  busy: boolean;
  serverError: string | null;
  onClose: () => void;
  onCreate: (input: CreateTablesInput) => void;
  onUpdate: (input: UpdateTableInput) => void;
}

/** Issue Zod → error field (kapasitas atau label). */
const fieldError = (issue?: { path: PropertyKey[]; message: string }) =>
  issue?.path.includes('capacity') ? { capacity: issue.message } : { label: issue?.message };

const parseCapacity = (value: string) => (value.trim() === '' ? null : /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN);

/**
 * Tambah/ubah meja (FR-011). Tambah mendukung banyak sekaligus: "1, 2, 3" atau rentang "A1-A10"
 * (kapasitas hanya untuk satu meja). Dirender ulang (key) setiap dibuka.
 */
export function TableFormSheet({ table, busy, serverError, onClose, onCreate, onUpdate }: TableFormSheetProps) {
  const [label, setLabel] = useState(table?.label ?? '');
  const [capacity, setCapacity] = useState(table?.capacity === null || table === null ? '' : String(table.capacity));
  const [errors, setErrors] = useState<{ label?: string; capacity?: string }>({});
  const preview = table ? null : parseTableLabels(label);
  const bulk = (preview?.labels.length ?? 0) > 1;

  const submit = () => {
    const cap = parseCapacity(capacity);
    if (Number.isNaN(cap)) return setErrors({ capacity: 'Isi dengan angka bulat' });

    if (!table) {
      const { labels, error } = parseTableLabels(label);
      if (error) return setErrors({ label: error });
      const input = labels.length > 1 ? { labels } : { label: labels[0]!, ...(cap !== null && { capacity: cap }) };
      const parsed = createTablesSchema.safeParse(input);
      if (!parsed.success) return setErrors(fieldError(parsed.error.issues[0]));
      return onCreate(parsed.data);
    }

    const changes = {
      ...(label.trim() !== table.label ? { label } : {}),
      ...(cap !== table.capacity ? { capacity: cap } : {}),
    };
    if (Object.keys(changes).length === 0) return onClose();
    const parsed = updateTableSchema.safeParse(changes);
    if (!parsed.success) return setErrors(fieldError(parsed.error.issues[0]));
    onUpdate(parsed.data);
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={table ? `Ubah Meja ${table.label}` : 'Tambah meja'}
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          {bulk ? `Tambah ${preview!.labels.length} meja` : 'Simpan'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Label meja"
          hint={table ? 'Maks. 20 karakter, unik di outlet ini.' : 'Satu meja, atau banyak sekaligus: "1, 2, 3" atau "A1-A10".'}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErrors({});
          }}
          error={errors.label ?? serverError ?? undefined}
        />
        {bulk ? (
          <p className="rounded-xl bg-primary-soft p-3 text-sm text-primary">
            Akan menambah {preview!.labels.length} meja: {preview!.labels.slice(0, 12).join(', ')}
            {preview!.labels.length > 12 && ', …'}
          </p>
        ) : (
          <Input
            label="Kapasitas"
            hint="Opsional, jumlah kursi."
            inputMode="numeric"
            value={capacity}
            onChange={(e) => {
              setCapacity(e.target.value);
              setErrors({});
            }}
            error={errors.capacity}
          />
        )}
      </div>
    </BottomSheet>
  );
}
