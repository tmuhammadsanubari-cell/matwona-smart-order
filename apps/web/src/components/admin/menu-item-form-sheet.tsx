'use client';

import { useState } from 'react';
import { formatRupiah } from 'shared';
import type { CategoryDto, MenuItemDto, MenuItemInput, MenuItemUpdateInput } from 'shared';
import { BottomSheet, Button, Input, Textarea } from '@/components/ui';
import { MenuPhotoField } from './menu-photo-field';
import {
  changedOlseraFields,
  emptyMenuItemForm,
  menuItemToForm,
  parseMenuItemChanges,
  parseNewMenuItem,
  type MenuItemFieldErrors,
  type MenuItemFormValues,
} from '@/lib/menu-form';

export interface MenuItemFormSheetProps {
  /** null = menu baru. */
  item: MenuItemDto | null;
  categories: CategoryDto[];
  defaultCategoryId?: string;
  busy: boolean;
  serverError: string | null;
  serverFieldErrors?: MenuItemFieldErrors;
  onClose: () => void;
  onCreate: (input: MenuItemInput) => void;
  onUpdate: (input: MenuItemUpdateInput) => void;
}

/**
 * Form tambah/ubah menu (FR-010): nama wajib, harga integer Rupiah ≥ 0, stok opsional (kosong = tidak
 * dilacak). Item dari Olsera memberi peringatan bila nama/harga/stok diubah manual.
 */
export function MenuItemFormSheet(props: MenuItemFormSheetProps) {
  const { item, categories, busy, serverError, serverFieldErrors, onClose, onCreate, onUpdate } = props;
  const [values, setValues] = useState<MenuItemFormValues>(() =>
    item ? menuItemToForm(item) : emptyMenuItemForm(props.defaultCategoryId ?? categories[0]?.id ?? ''),
  );
  const [errors, setErrors] = useState<MenuItemFieldErrors>({});
  // Error lokal yang sudah dihapus (undefined) tidak boleh menimpa error dari server.
  const fieldErrors: MenuItemFieldErrors = { ...serverFieldErrors };
  for (const [key, message] of Object.entries(errors)) if (message) fieldErrors[key as keyof MenuItemFieldErrors] = message;
  const olseraChanges = changedOlseraFields(item, values);

  const set = <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = () => {
    if (!item) {
      const parsed = parseNewMenuItem(values);
      if (!parsed.ok) return setErrors(parsed.errors);
      return onCreate(parsed.data);
    }
    const parsed = parseMenuItemChanges(item, values);
    if (!parsed.ok) return setErrors(parsed.errors);
    if (parsed.data === null) return onClose();
    onUpdate(parsed.data);
  };

  const pricePreview = /^\d+$/.test(values.price.replace(/\./g, '')) ? formatRupiah(Number(values.price.replace(/\./g, ''))) : null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={item ? `Ubah ${item.name}` : 'Tambah menu'}
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          Simpan
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {item ? (
          <MenuPhotoField item={item} />
        ) : (
          <p className="rounded-control bg-neutral-soft p-3 text-sm text-neutral">Foto bisa diunggah setelah menu disimpan.</p>
        )}
        {item?.olseraProductId && (
          <p className={olseraChanges.length ? 'rounded-xl bg-danger-soft p-3 text-sm text-danger' : 'rounded-xl bg-primary-soft p-3 text-sm text-primary'} role={olseraChanges.length ? 'alert' : undefined}>
            {olseraChanges.length
              ? `Perhatian: ${olseraChanges.join(', ')} menu ini bersumber dari Olsera dan bisa tertimpa saat sinkron berikutnya.`
              : '🔄 Menu ini tersinkron dari Olsera. Nama, harga, dan stok mengikuti data Olsera.'}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Kategori
          <select
            value={values.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            aria-invalid={fieldErrors.categoryId ? true : undefined}
            className="min-h-12 rounded-xl border-2 border-line bg-surface px-3 text-base font-normal"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && <span className="font-normal text-danger">{fieldErrors.categoryId}</span>}
        </label>

        <Input label="Nama menu" maxLength={100} value={values.name} onChange={(e) => set('name', e.target.value)} error={fieldErrors.name} />
        <Textarea
          label="Deskripsi"
          hint="Opsional, maks. 300 karakter."
          maxLength={300}
          rows={2}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={fieldErrors.description}
        />
        <Input
          label="Harga (Rupiah)"
          inputMode="numeric"
          placeholder="mis. 45000"
          hint={pricePreview ?? 'Bilangan bulat, tanpa desimal.'}
          value={values.price}
          onChange={(e) => set('price', e.target.value)}
          error={fieldErrors.price}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Stok"
            inputMode="numeric"
            hint="Kosongkan bila tidak dilacak."
            value={values.stock}
            onChange={(e) => set('stock', e.target.value)}
            error={fieldErrors.stock}
          />
          <Input
            label="Urutan"
            inputMode="numeric"
            hint="Kecil = tampil di atas."
            value={values.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
            error={fieldErrors.sortOrder}
          />
        </div>
        <Input label="SKU" hint="Opsional, unik per outlet." maxLength={64} value={values.sku} onChange={(e) => set('sku', e.target.value)} error={fieldErrors.sku} />
        <label className="flex min-h-11 items-center gap-3 text-ink">
          <input
            type="checkbox"
            checked={values.isAvailable}
            onChange={(e) => set('isAvailable', e.target.checked)}
            className="size-5 accent-primary"
          />
          Tersedia (tidak habis)
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
