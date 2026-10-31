'use client';

import { useState } from 'react';
import { categorySchema, categoryUpdateSchema } from 'shared';
import type { CategoryDto, CategoryInput, CategoryUpdateInput } from 'shared';
import { BottomSheet, Button, Input } from '@/components/ui';

export interface CategoryFormSheetProps {
  /** null = kategori baru. */
  category: CategoryDto | null;
  busy: boolean;
  serverError: string | null;
  onClose: () => void;
  onCreate: (input: CategoryInput) => void;
  onUpdate: (input: CategoryUpdateInput) => void;
}

/**
 * Form tambah/ubah kategori (FR-010). Dirender ulang (key) setiap dibuka sehingga state awal
 * selalu dari data terbaru.
 */
export function CategoryFormSheet({ category, busy, serverError, onClose, onCreate, onUpdate }: CategoryFormSheetProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (!category) {
      const parsed = categorySchema.safeParse({ name, isActive });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message);
      return onCreate(parsed.data);
    }
    const changes = {
      ...(name.trim() !== category.name ? { name } : {}),
      ...(isActive !== category.isActive ? { isActive } : {}),
    };
    if (Object.keys(changes).length === 0) return onClose();
    const parsed = categoryUpdateSchema.safeParse(changes);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    onUpdate(parsed.data);
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={category ? 'Ubah kategori' : 'Tambah kategori'}
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          Simpan
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama kategori" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} error={error} />
        <label className="flex min-h-11 items-center gap-3 text-ink">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-5 accent-primary"
          />
          Tampilkan di menu pelanggan
        </label>
        {serverError && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {serverError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
