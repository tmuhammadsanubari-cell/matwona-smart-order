import type { PublicMenu } from 'shared';

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
