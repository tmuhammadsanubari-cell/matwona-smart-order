/** Katalog acuan dari tiga lembar menu Matwona yang diberikan mitra pada 11 November 2026.
 * Dipakai oleh buku menu publik dan seed lokal agar nama serta harga tidak berbeda.
 * Ketersediaan dan perubahan operasional tetap dikelola lewat API/admin.
 */
export interface CatalogItem {
  sku: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  spicy?: boolean;
}

export interface CatalogSection {
  id: string;
  name: string;
  items: CatalogItem[];
}

const photo = (filename: string) => `/menu/${filename}`;
const item = (
  sku: string,
  name: string,
  price: number,
  description: string,
  image?: string,
  spicy?: boolean,
): CatalogItem => ({
  sku,
  name,
  price,
  description,
  ...(image ? { imageUrl: photo(image) } : {}),
  ...(spicy ? { spicy } : {}),
});

export const MATWONA_CATALOG: CatalogSection[] = [
  {
    id: 'tuna',
    name: 'Olahan Tuna',
    items: [
      item(
        'TN-SMT-R',
        'Matwona Sambal Matah Reguler',
        19000,
        'Tuna suwir dengan sambal matah segar, nasi, jukut goreng, dan kremesan.',
        'tuna-matah-reguler.png',
        true,
      ),
      item(
        'TN-SMT-J',
        'Matwona Sambal Matah Jumbo',
        29000,
        'Tuna suwir dengan sambal matah segar dalam porsi jumbo, nasi, jukut goreng, dan kremesan.',
        'tuna-matah-jumbo.png',
        true,
      ),
      item(
        'TN-DAB-R',
        'Matwona Sambal Dabu-Dabu Reguler',
        19000,
        'Tuna suwir dengan sambal dabu-dabu segar, nasi, jukut goreng, dan kremesan.',
        'tuna-dabu-reguler.png',
        true,
      ),
      item(
        'TN-DAB-J',
        'Matwona Sambal Dabu-Dabu Jumbo',
        29000,
        'Tuna suwir dengan sambal dabu-dabu segar dalam porsi jumbo, nasi, jukut goreng, dan kremesan.',
        'tuna-dabu-jumbo.png',
        true,
      ),
      item(
        'TN-LDG-R',
        'Matwona Lada Garam Reguler',
        19000,
        'Tuna suwir berbumbu lada garam dengan nasi, jukut goreng, dan kremesan.',
        'tuna-lada-reguler.png',
        true,
      ),
      item(
        'TN-LDG-J',
        'Matwona Lada Garam Jumbo',
        29000,
        'Tuna suwir berbumbu lada garam dalam porsi jumbo dengan nasi, jukut goreng, dan kremesan.',
        'tuna-lada-jumbo.png',
        true,
      ),
    ],
  },
  {
    id: 'non-spicy',
    name: 'Non-Spicy',
    items: [
      item(
        'TN-MYO-R',
        'Matwona Mayo Reguler',
        17000,
        'Olahan tuna dengan mayo, pilihan non-pedas dalam porsi reguler.',
      ),
      item(
        'TN-MYO-J',
        'Matwona Mayo Jumbo',
        26000,
        'Olahan tuna dengan mayo, pilihan non-pedas dalam porsi jumbo.',
      ),
    ],
  },
  {
    id: 'bakmie',
    name: 'Bakmie Series',
    items: [
      item(
        'BM-AY-LDG',
        'Bakmie Ayam Kampung Lada Garam',
        35000,
        'Mi homemade berbahan tepung mocaf, dengan ayam kampung suwir berbumbu lada garam dan jukut goreng.',
        'bakmie-ayam.png',
      ),
      item(
        'BM-AY-CHO',
        'Bakmie Chilli Oil Ayam Kampung Lada Garam',
        38000,
        'Mi homemade berbahan tepung mocaf, ayam kampung lada garam, jukut goreng, dan chilli oil.',
        'bakmie-ayam-chilli.png',
        true,
      ),
      item(
        'BM-TN-ORI',
        'Bakmie Tuna Lada Garam',
        35000,
        'Mi homemade berbahan tepung mocaf, dengan tuna suwir berbumbu lada garam dan jukut goreng.',
        'bakmie-tuna.png',
      ),
      item(
        'BM-TN-CHO',
        'Bakmie Chilli Oil Tuna Lada Garam',
        38000,
        'Mi homemade berbahan tepung mocaf, tuna lada garam, jukut goreng, dan chilli oil.',
        'bakmie-tuna-chilli.png',
        true,
      ),
      item(
        'BM-AY-ABN',
        'Bakmie Abon Ayam Kampung',
        33000,
        'Bakmie dengan topping abon ayam kampung.',
      ),
    ],
  },
  {
    id: 'nasi-telur',
    name: 'Paket Nasi Telur Barendo',
    items: [
      item('TL-NSP', 'Paket Nasi Telur Barendo', 13000, 'Nasi dengan telur barendo.'),
      item(
        'TL-CHO',
        'Paket Nasi Telur Barendo Chilli Oil',
        16000,
        'Nasi dan telur barendo dengan chilli oil.',
        undefined,
        true,
      ),
      item(
        'TL-SMT',
        'Paket Nasi Telur Barendo Matah',
        15000,
        'Nasi dan telur barendo dengan sambal matah.',
        undefined,
        true,
      ),
      item(
        'TL-DAB',
        'Paket Nasi Telur Barendo Dabu-Dabu',
        15000,
        'Nasi dan telur barendo dengan sambal dabu-dabu.',
        undefined,
        true,
      ),
    ],
  },
  {
    id: 'camilan',
    name: 'Camilan & Dessert',
    items: [
      item('CM-SC-ORI', 'Soft Cookies Chocolate', 10000, 'Soft cookies rasa cokelat.'),
      item('CM-RS-GRG', 'Risol Tuna Melt', 10000, 'Risol dengan isian tuna melt.'),
      item(
        'CM-RS-FRZ',
        'Risol Tuna Melt Frozen (Isi 3)',
        28000,
        'Risol tuna melt beku, satu kemasan isi tiga.',
      ),
    ],
  },
  {
    id: 'tambahan',
    name: 'Alacarte & Tambahan',
    items: [
      item(
        'TB-TWN-MTH',
        'Xtra Twona Matah',
        12000,
        'Tambahan olahan tuna sambal matah tanpa nasi.',
        undefined,
        true,
      ),
      item(
        'TB-TWN-DAB',
        'Xtra Twona Dabu',
        12000,
        'Tambahan olahan tuna sambal dabu-dabu tanpa nasi.',
        undefined,
        true,
      ),
      item(
        'TB-TWN-LDG',
        'Xtra Twona Lada Garam',
        12000,
        'Tambahan olahan tuna lada garam tanpa nasi.',
      ),
      item('TB-NSP', 'Xtra Nasi', 6000, 'Tambahan nasi putih.'),
      item('TB-CHIPS', 'Xtra Chips', 5000, 'Tambahan chips renyah.'),
      item('TB-SB-MTH', 'Xtra Sambal Matah', 6000, 'Tambahan sambal matah.', undefined, true),
      item('TB-SB-DAB', 'Xtra Sambal Dabu', 6000, 'Tambahan sambal dabu-dabu.', undefined, true),
      item('TB-CHO', 'Xtra Chilli Oil', 6000, 'Tambahan chilli oil.', undefined, true),
      item('TB-JKT-GRG', 'Jukut Goreng', 7000, 'Tambahan jukut goreng.'),
      item('TB-KRM', 'Xtra Kremesan', 3000, 'Tambahan kremesan renyah.'),
    ],
  },
  {
    id: 'kopi',
    name: 'Signature Coffee',
    items: [
      item(
        'MN-KSB',
        'Kopi Susu Butter',
        18000,
        'Kopi susu hangat dengan butter.',
        'kopi-butter.png',
      ),
      item('MN-KSC', 'Kopi Susu Classic', 15000, 'Kopi susu classic hangat.', 'kopi-susu.png'),
      item(
        'MN-KSCI',
        'Kopi Susu Classic Ice',
        17000,
        'Kopi susu classic dingin.',
        'kopi-susu-ice.png',
      ),
      item('MN-KHC', 'Kopi Hitam Classic', 10000, 'Kopi hitam classic hangat.', 'kopi-hitam.webp'),
      item(
        'MN-KHCI',
        'Kopi Hitam Classic Ice',
        12000,
        'Kopi hitam classic dingin.',
        'kopi-hitam-ice.png',
      ),
      item('MN-KL', 'Kopi Lemon', 17000, 'Kopi dengan lemon.', 'kopi-lemon.png'),
    ],
  },
  {
    id: 'black-tea',
    name: 'Signature Black Tea',
    items: [
      item('MN-BMTH', 'Black Milk Tea Hot', 16000, 'Black milk tea hangat.', 'black-tea-hot.png'),
      item('MN-BMTI', 'Black Milk Tea Ice', 18000, 'Black milk tea dingin.', 'black-tea-ice.png'),
    ],
  },
  {
    id: 'minuman',
    name: 'Minuman Segar',
    items: [
      item('MN-IL', 'Ice Lemon', 16000, 'Minuman lemon dingin.'),
      item('MN-LMT', 'Ice Lemon Tea', 16000, 'Teh lemon dingin.'),
      item('MN-ETM', 'Sweet Iced Tea', 8000, 'Es teh manis.'),
      item('MN-ETT', 'Plain Iced Tea', 6000, 'Es teh tawar.'),
      item('MN-AIR', 'Mineral Water', 6000, 'Air mineral.'),
      item('MN-HLT', 'Hot Lemon Tea', 14000, 'Teh lemon hangat.'),
      item('MN-HST', 'Hot Sweet Tea', 7000, 'Teh manis hangat.'),
      item('MN-HPT', 'Hot Plain Tea', 5000, 'Teh tawar hangat.'),
    ],
  },
];
