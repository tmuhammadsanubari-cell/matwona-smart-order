import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';

export type MenuDisplayEntry =
  | { kind: 'single'; key: string; item: PublicMenuItem }
  | {
      kind: 'group';
      key: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      minPrice: number;
      maxPrice: number;
      isAvailable: boolean;
      items: PublicMenuItem[];
    };

/**
 * Mengelompokkan item menu yang memiliki `variantGroup` sama di dalam satu kategori menjadi satu kartu
 * agar daftar menu mobile lebih ringkas dan tidak melelahkan untuk di-scroll.
 */
export function buildMenuDisplayEntries(items: PublicMenuItem[]): MenuDisplayEntry[] {
  const entries: MenuDisplayEntry[] = [];
  const groupsByName = new Map<string, Extract<MenuDisplayEntry, { kind: 'group' }>>();

  for (const item of items) {
    const groupName = item.variantGroup?.trim();
    if (!groupName) {
      entries.push({ kind: 'single', key: item.id, item });
      continue;
    }

    const existing = groupsByName.get(groupName);
    if (existing) {
      existing.items.push(item);
      existing.minPrice = Math.min(existing.minPrice, item.price);
      existing.maxPrice = Math.max(existing.maxPrice, item.price);
      existing.isAvailable = existing.isAvailable || item.isAvailable;
      if (!existing.imageUrl && item.imageUrl) existing.imageUrl = item.imageUrl;
      continue;
    }

    const group: Extract<MenuDisplayEntry, { kind: 'group' }> = {
      kind: 'group',
      key: `group:${groupName}`,
      name: groupName,
      description: item.description,
      imageUrl: item.imageUrl,
      minPrice: item.price,
      maxPrice: item.price,
      isAvailable: item.isAvailable,
      items: [item],
    };
    groupsByName.set(groupName, group);
    entries.push(group);
  }

  return entries;
}

export function groupPriceLabel(minPrice: number, maxPrice: number): string {
  return minPrice === maxPrice ? formatRupiah(minPrice) : `Mulai ${formatRupiah(minPrice)}`;
}

export function variantOptionLabel(item: PublicMenuItem): string {
  const base = item.variantLabel?.trim() || item.name;
  return item.spiceLevel?.trim() ? `${base} (${item.spiceLevel.trim()})` : base;
}
