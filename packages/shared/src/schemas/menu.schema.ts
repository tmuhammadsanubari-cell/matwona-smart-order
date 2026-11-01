import { z } from 'zod';

// Sumber: PRD 2.2.7 & tabel categories, menu_items (4.2)

const categoryName = z.string().trim().min(1, 'Nama kategori wajib diisi').max(60);
const itemName = z.string().trim().min(1, 'Nama menu wajib diisi').max(100);
const description = z.string().trim().max(300).nullable();
/** Uang = integer Rupiah (aturan bisnis #2). */
const price = z.number().int('Harga harus bilangan bulat').min(0, 'Harga tidak boleh negatif');
/** null = stok tidak dilacak. */
const stock = z.number().int().min(0, 'Stok tidak boleh negatif').nullable();
const sku = z.string().trim().min(1).max(64).nullable();
const sortOrder = z.number().int().min(0);

export const categorySchema = z.object({
  name: categoryName,
  sortOrder: sortOrder.default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;

/**
 * Update parsial sengaja tanpa .default(): di Zod 4 `.partial()` tetap menerapkan default,
 * sehingga field yang tidak dikirim akan ikut tertimpa.
 */
export const categoryUpdateSchema = z
  .object({ name: categoryName, sortOrder, isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Tidak ada data yang diubah');
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/** PATCH /categories/reorder: urutan baru = posisi id di array. */
export const categoryReorderSchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, 'ID kategori tidak boleh ganda'),
});
export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;

export const menuItemSchema = z.object({
  categoryId: z.uuid(),
  name: itemName,
  description: description.optional(),
  price,
  stock: stock.optional(),
  sku: sku.optional(),
  isAvailable: z.boolean().default(true),
  sortOrder: sortOrder.default(0),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuItemUpdateSchema = z
  .object({
    categoryId: z.uuid(),
    name: itemName,
    description,
    price,
    stock,
    sku,
    isAvailable: z.boolean(),
    sortOrder,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Tidak ada data yang diubah');
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;

export const menuAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type MenuAvailabilityInput = z.infer<typeof menuAvailabilitySchema>;

/** Query GET /menu-items. */
export const menuItemListQuerySchema = z.object({
  categoryId: z.uuid().optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type MenuItemListQuery = z.infer<typeof menuItemListQuerySchema>;

export interface CategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Jumlah item yang belum diarsipkan. */
  itemCount: number;
}

/** Item menu untuk dashboard admin & kasir. */
export interface MenuItemDto {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number | null;
  sku: string | null;
  isAvailable: boolean;
  isArchived: boolean;
  sortOrder: number;
  /** Terisi bila item bersumber dari Olsera: UI menampilkan ikon "tersinkron Olsera" (FR-010). */
  olseraProductId: string | null;
  lastSyncedAt: string | null;
}

/** Item di menu pelanggan. `isAvailable = false` berarti tampil abu-abu "Habis" (FR-002). */
export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

/** Response GET /public/outlets/:slug/menu. Kategori & item sudah terurut `sortOrder`. */
export interface PublicMenu {
  outlet: { id: string; slug: string; name: string };
  categories: { id: string; name: string; items: PublicMenuItem[] }[];
}

/** Foto menu (FR-010 AC): JPG/PNG/WebP, maks. 2 MB. Dipakai API (validasi) & web (input file). */
export const MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MenuImageType = (typeof MENU_IMAGE_TYPES)[number];
export const MENU_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
