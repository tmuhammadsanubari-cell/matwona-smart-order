import type { MenuItemDto } from 'shared';
import { changedOlseraFields, emptyMenuItemForm, menuItemToForm, parseMenuItemChanges, parseNewMenuItem, menuImageError } from './menu-form';

const CAT = '00000000-0000-4000-8000-000000000001';
const item = (overrides: Partial<MenuItemDto> = {}): MenuItemDto => ({
  id: 'i1',
  categoryId: CAT,
  name: 'Tuna Sambal Matah',
  description: null,
  price: 45000,
  imageUrl: null,
  stock: 10,
  sku: 'TN-SMT',
  isAvailable: true,
  isArchived: false,
  sortOrder: 0,
  olseraProductId: null,
  lastSyncedAt: null,
  ...overrides,
});

describe('form menu (FR-010)', () => {
  it('menu baru: harga "45.000" → 45000, stok/SKU/deskripsi kosong → null', () => {
    const result = parseNewMenuItem({ ...emptyMenuItemForm(CAT), name: ' Es Jeruk ', price: '45.000' });
    expect(result).toEqual({
      ok: true,
      data: {
        categoryId: CAT,
        name: 'Es Jeruk',
        description: null,
        price: 45000,
        stock: null,
        sku: null,
        sortOrder: 0,
        isAvailable: true,
      },
    });
  });

  it('validasi: nama wajib, harga bilangan bulat ≥ 0, stok ≥ 0', () => {
    const bad = (values: Partial<ReturnType<typeof emptyMenuItemForm>>) => {
      const r = parseNewMenuItem({ ...emptyMenuItemForm(CAT), name: 'Menu', price: '1000', ...values });
      return r.ok ? {} : r.errors;
    };
    expect(bad({ name: '  ' }).name).toBe('Nama menu wajib diisi');
    expect(bad({ price: '' }).price).toBe('Isi dengan angka bulat');
    expect(bad({ price: '45000,5' }).price).toBe('Isi dengan angka bulat');
    expect(bad({ price: '-1' }).price).toBe('Harga tidak boleh negatif');
    expect(bad({ stock: '-3' }).stock).toBe('Stok tidak boleh negatif');
    expect(bad({ categoryId: '' }).categoryId).toBeTruthy();
  });

  it('ubah menu: hanya field yang berubah yang dikirim; tanpa perubahan → null', () => {
    const original = item();
    expect(parseMenuItemChanges(original, menuItemToForm(original))).toEqual({ ok: true, data: null });
    const values = { ...menuItemToForm(original), price: '47000', stock: '' };
    expect(parseMenuItemChanges(original, values)).toEqual({ ok: true, data: { price: 47000, stock: null } });
  });

  it('peringatan Olsera hanya untuk item tersinkron saat nama/harga/stok diubah', () => {
    const synced = item({ olseraProductId: 'OLS-1' });
    expect(changedOlseraFields(synced, menuItemToForm(synced))).toEqual([]);
    expect(changedOlseraFields(synced, { ...menuItemToForm(synced), price: '47000', name: 'Baru' })).toEqual(['nama', 'harga']);
    expect(changedOlseraFields(synced, { ...menuItemToForm(synced), sku: 'X' })).toEqual([]);
    expect(changedOlseraFields(item(), { ...menuItemToForm(item()), price: '1' })).toEqual([]);
  });
});

describe('menuImageError (S2-11)', () => {
  it('JPG/PNG/WebP ≤ 2 MB lolos; format lain atau > 2 MB ditolak dengan pesan', () => {
    expect(menuImageError({ type: 'image/jpeg', size: 500_000 })).toBeNull();
    expect(menuImageError({ type: 'image/webp', size: 2 * 1024 * 1024 })).toBeNull();
    expect(menuImageError({ type: 'image/gif', size: 1000 })).toBe('Format foto harus JPG, PNG, atau WebP.');
    expect(menuImageError({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe('Ukuran foto maksimal 2 MB.');
  });
});
