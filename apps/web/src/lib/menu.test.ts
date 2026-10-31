import type { PublicMenu } from 'shared';
import { cloudinaryLoader } from './cloudinary-loader';
import { filterMenu, normalizeSearch, photoTonesByItem, photoToneFor } from './menu';

const item = (id: string, name: string) => ({ id, name, description: null, price: 1000, imageUrl: null, isAvailable: true });
const categories: PublicMenu['categories'] = [
  { id: 'tuna', name: 'Olahan Tuna', items: [item('t1', 'Tuna Sambal Matah'), item('t2', 'Tuna Geprek')] },
  { id: 'minum', name: 'Minuman', items: [item('m1', 'Es Teh Serai'), item('m2', 'Es Jeruk')] },
];

describe('pencarian menu (FR-002)', () => {
  it('normalizeSearch: huruf kecil, tanpa diakritik & spasi ganda', () => {
    expect(normalizeSearch('  Ës   TEH ')).toBe('es teh');
  });

  it('query kosong mengembalikan semua kategori', () => {
    expect(filterMenu(categories, '   ')).toBe(categories);
  });

  it('memfilter item per nama (tidak peka huruf besar) dan menyembunyikan kategori kosong', () => {
    expect(filterMenu(categories, 'TEH')).toEqual([{ id: 'minum', name: 'Minuman', items: [item('m1', 'Es Teh Serai')] }]);
    expect(filterMenu(categories, 'tuna').map((c) => c.items.length)).toEqual([2]);
    expect(filterMenu(categories, 'rendang')).toEqual([]);
  });

  it('urutan kategori & item dari server dipertahankan', () => {
    expect(filterMenu(categories, 'e').flatMap((c) => c.items.map((i) => i.id))).toEqual(['t2', 'm1', 'm2']);
  });
});

describe('cloudinaryLoader', () => {
  it('menyisipkan transformasi w_<lebar>,f_auto,q_auto', () => {
    expect(
      cloudinaryLoader({ src: 'https://res.cloudinary.com/demo/image/upload/v1/menu/tuna.jpg', width: 192 }),
    ).toBe('https://res.cloudinary.com/demo/image/upload/w_192,f_auto,q_auto/v1/menu/tuna.jpg');
  });

  it('URL selain Cloudinary dikembalikan apa adanya', () => {
    expect(cloudinaryLoader({ src: '/brand/placeholder.png', width: 96 })).toBe('/brand/placeholder.png');
  });
});

describe('warna placeholder foto (desain C1)', () => {
  it('menebak jenis dari nama kategori', () => {
    expect(photoToneFor('Olahan Tuna')).toBe('tuna');
    expect(photoToneFor('Olahan Ayam Kampung')).toBe('chicken');
    expect(photoToneFor('Minuman')).toBe('drink');
    expect(photoToneFor('Es & Jus')).toBe('drink');
    expect(photoToneFor('Tambahan')).toBe('none');
  });

  it('memetakan setiap item ke warna kategorinya', () => {
    const tones = photoTonesByItem(categories);
    expect(tones.get('t2')).toBe('tuna');
    expect(tones.get('m1')).toBe('drink');
  });
});
