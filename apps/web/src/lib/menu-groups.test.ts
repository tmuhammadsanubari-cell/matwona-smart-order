import { describe, expect, it } from 'vitest';
import type { PublicMenuItem } from 'shared';
import { buildMenuDisplayEntries, groupPriceLabel, variantOptionLabel } from './menu-groups';

const makeItem = (id: string, overrides: Partial<PublicMenuItem> = {}): PublicMenuItem => ({
  id,
  name: `Item ${id}`,
  description: null,
  price: 29000,
  imageUrl: null,
  isAvailable: true,
  ...overrides,
});

describe('buildMenuDisplayEntries (Peringkas Menu Varian)', () => {
  it('menggabungkan item ber-variantGroup sama menjadi satu grup ringkas', () => {
    const items = [
      makeItem('1', { name: 'Matwona Sambal Matah Jumbo', variantGroup: 'Matwona Tuna Jumbo', variantLabel: 'Sambal Matah', spiceLevel: 'Pedas Level 2' }),
      makeItem('2', { name: 'Matwona Sambal Dabu Jumbo', variantGroup: 'Matwona Tuna Jumbo', variantLabel: 'Sambal Dabu-Dabu', spiceLevel: 'Pedas Level 1', isAvailable: false }),
      makeItem('3', { name: 'Bakmie Abon', price: 33000 }),
    ];

    const entries = buildMenuDisplayEntries(items);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: 'group',
      name: 'Matwona Tuna Jumbo',
      minPrice: 29000,
      maxPrice: 29000,
      isAvailable: true,
    });
    if (entries[0]?.kind === 'group') {
      expect(entries[0].items).toHaveLength(2);
    }
    expect(entries[1]).toMatchObject({ kind: 'single', item: items[2] });
  });

  it('memformat label harga seragam vs mulai dari, serta label varian dengan level pedas', () => {
    expect(groupPriceLabel(29000, 29000)).toBe('Rp 29.000');
    expect(groupPriceLabel(17000, 26000)).toBe('Mulai Rp 17.000');
    expect(
      variantOptionLabel(makeItem('1', { variantLabel: 'Lada Garam', spiceLevel: 'Pedas Level 1' })),
    ).toBe('Lada Garam (Pedas Level 1)');
  });
});
