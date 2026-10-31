import type { PublicMenu } from 'shared';
import type { PhotoTone } from '@/components/ui';

/** Huruf kecil tanpa diakritik & spasi berlebih, agar "es  TEH" cocok dengan "Es Teh Serai". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filter menu berdasarkan nama item (FR-002, client-side). Kategori tanpa item yang cocok
 * disembunyikan; urutan kategori & item dari server dipertahankan.
 */
export function filterMenu(categories: PublicMenu['categories'], query: string): PublicMenu['categories'] {
  const q = normalizeSearch(query);
  if (!q) return categories;
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => normalizeSearch(item.name).includes(q)),
    }))
    .filter((category) => category.items.length > 0);
}

/**
 * Warna placeholder foto berdasarkan nama kategori (desain C1): tuna, ayam, minuman, selain itu netral.
 * Hanya untuk item yang belum punya foto.
 */
export function photoToneFor(categoryName: string): PhotoTone {
  const name = normalizeSearch(categoryName);
  if (name.includes('tuna')) return 'tuna';
  if (name.includes('ayam')) return 'chicken';
  if (/minum|jus|kopi|\bteh\b|\bes\b/.test(name)) return 'drink';
  return 'none';
}

/** Peta id item → warna placeholder foto, dari kategori tempat item berada. */
export function photoTonesByItem(categories: PublicMenu['categories']): Map<string, PhotoTone> {
  return new Map(categories.flatMap((c) => c.items.map((i) => [i.id, photoToneFor(c.name)] as const)));
}
