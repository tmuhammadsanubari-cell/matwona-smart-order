import { menuItemSchema, menuItemUpdateSchema } from 'shared';
import type { MenuItemDto, MenuItemInput, MenuItemUpdateInput } from 'shared';

/** Nilai mentah form menu (semua string dari input HTML). */
export interface MenuItemFormValues {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  /** Kosong = stok tidak dilacak. */
  stock: string;
  sku: string;
  sortOrder: string;
  isAvailable: boolean;
}

export type MenuItemFieldErrors = Partial<Record<keyof MenuItemFormValues, string>>;

export const emptyMenuItemForm = (categoryId = ''): MenuItemFormValues => ({
  categoryId,
  name: '',
  description: '',
  price: '',
  stock: '',
  sku: '',
  sortOrder: '0',
  isAvailable: true,
});

export const menuItemToForm = (item: MenuItemDto): MenuItemFormValues => ({
  categoryId: item.categoryId,
  name: item.name,
  description: item.description ?? '',
  price: String(item.price),
  stock: item.stock === null ? '' : String(item.stock),
  sku: item.sku ?? '',
  sortOrder: String(item.sortOrder),
  isAvailable: item.isAvailable,
});

/** "45.000" / "45000" → 45000; teks lain → NaN agar ditolak validasi (uang = integer Rupiah). */
const toInt = (value: string) => {
  const digits = value.trim().replace(/\./g, '');
  return /^-?\d+$/.test(digits) ? Number(digits) : Number.NaN;
};

/** Ubah nilai form ke tipe payload API; string kosong opsional → null. */
function toPayload(values: MenuItemFormValues) {
  return {
    categoryId: values.categoryId,
    name: values.name,
    description: values.description.trim() || null,
    price: toInt(values.price),
    stock: values.stock.trim() === '' ? null : toInt(values.stock),
    sku: values.sku.trim() || null,
    sortOrder: values.sortOrder.trim() === '' ? 0 : toInt(values.sortOrder),
    isAvailable: values.isAvailable,
  };
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: MenuItemFieldErrors };

function collectErrors(issues: { path: PropertyKey[]; message: string }[]): MenuItemFieldErrors {
  const errors: MenuItemFieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? 'name') as keyof MenuItemFormValues;
    const message = /expected number/i.test(issue.message) ? 'Isi dengan angka bulat' : issue.message;
    errors[field] ??= message;
  }
  return errors;
}

/** Validasi form "Tambah menu" dengan skema shared (FR-010). */
export function parseNewMenuItem(values: MenuItemFormValues): ParseResult<MenuItemInput> {
  const parsed = menuItemSchema.safeParse(toPayload(values));
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, errors: collectErrors(parsed.error.issues) };
}

/**
 * Validasi form "Ubah menu" dan kirim hanya field yang berubah (update parsial).
 * `data` kosong = tidak ada perubahan.
 */
export function parseMenuItemChanges(item: MenuItemDto, values: MenuItemFormValues): ParseResult<MenuItemUpdateInput | null> {
  const next = toPayload(values);
  const current = toPayload(menuItemToForm(item));
  const changes = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => current[key as keyof typeof current] !== value),
  );
  if (Object.keys(changes).length === 0) return { ok: true, data: null };
  const parsed = menuItemUpdateSchema.safeParse(changes);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, errors: collectErrors(parsed.error.issues) };
}

/** Field yang bersumber dari Olsera (PRD 2.2.10): perubahan manual bisa tertimpa saat sinkron. */
export const OLSERA_FIELDS = ['name', 'price', 'stock'] as const;

export function changedOlseraFields(item: MenuItemDto | null, values: MenuItemFormValues): string[] {
  if (!item?.olseraProductId) return [];
  const current = menuItemToForm(item);
  const labels = { name: 'nama', price: 'harga', stock: 'stok' } as const;
  return OLSERA_FIELDS.filter((f) => current[f].trim() !== values[f].trim()).map((f) => labels[f]);
}
