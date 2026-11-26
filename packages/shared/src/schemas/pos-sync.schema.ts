import { z } from 'zod';

export const OLSERA_ENVIRONMENTS = ['production', 'sandbox'] as const;
export type OlseraEnvironment = (typeof OLSERA_ENVIRONMENTS)[number];

export const OLSERA_BASE_URLS: Record<OlseraEnvironment, string> = {
  production: 'https://api-open.olsera.co.id',
  sandbox: 'https://api-open.all.olsera.indociti.com',
};

export const OLSERA_LANGS = ['id', 'en'] as const;
export type OlseraLang = (typeof OLSERA_LANGS)[number];

export interface OlseraSafeEndpointSpec {
  path: string;
  group: 'Global' | 'Produk & Kategori' | 'Pesanan' | 'Inventori' | 'Laporan' | 'Karyawan & Promo';
  label: string;
  description: string;
  recommendedQuery: Record<string, string | number>;
}

/**
 * Daftar endpoint Olsera Open API v1 yang DIJAMIN HANYA BACA (GET read-only).
 * Catatan: beberapa rute di Postman resmi Olsera (seperti salesreturn/updatestatus)
 * didaftarkan sebagai GET meski mengubah data, sehingga sengaja TIDAK masuk daftar ini.
 */
export const OLSERA_SAFE_READ_ENDPOINTS: readonly OlseraSafeEndpointSpec[] = [
  {
    path: 'global/store',
    group: 'Global',
    label: 'Daftar Toko / Outlet',
    description: 'Cek identitas store, nama toko, paket, dan store ID utama.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'global/store/detail',
    group: 'Global',
    label: 'Detail Toko (butuh id)',
    description: 'Lihat detail satu toko berdasarkan parameter id.',
    recommendedQuery: { id: 1 },
  },
  {
    path: 'global/storeusers',
    group: 'Global',
    label: 'Daftar User Toko',
    description: 'Daftar user yang terdaftar di outlet Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'collection',
    group: 'Produk & Kategori',
    label: 'Kategori / Collection',
    description: 'Ambil daftar kategori/koleksi menu di Olsera.',
    recommendedQuery: { per_page: 25, page: 1 },
  },
  {
    path: 'productgroup',
    group: 'Produk & Kategori',
    label: 'Grup Produk',
    description: 'Ambil pengelompokan produk (product group) di Olsera.',
    recommendedQuery: { per_page: 25, page: 1 },
  },
  {
    path: 'brand',
    group: 'Produk & Kategori',
    label: 'Daftar Brand',
    description: 'Daftar merek/brand produk.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'product',
    group: 'Produk & Kategori',
    label: 'Daftar Produk (Menu, SKU, Harga, Stok)',
    description: 'Endpoint utama untuk melihat produk, SKU, harga jual, dan stok POS.',
    recommendedQuery: { per_page: 20, page: 1 },
  },
  {
    path: 'product/detail',
    group: 'Produk & Kategori',
    label: 'Detail Produk & Varian (butuh id)',
    description: 'Struktur lengkap satu produk beserta varian & foto berdasarkan id produk.',
    recommendedQuery: { id: 1 },
  },
  {
    path: 'productvariantonlysearch',
    group: 'Produk & Kategori',
    label: 'Daftar Varian Produk',
    description: 'Cari daftar varian produk (SKU & harga varian).',
    recommendedQuery: { per_page: 20, page: 1 },
  },
  {
    path: 'productcombo',
    group: 'Produk & Kategori',
    label: 'Daftar Paket / Combo',
    description: 'Ambil produk bertipe paket combo di Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'prodaddons',
    group: 'Produk & Kategori',
    label: 'Add-on Produk (butuh product_id)',
    description: 'Ambil daftar add-on / topping untuk product_id tertentu.',
    recommendedQuery: { product_id: 1, per_page: 15, page: 1 },
  },
  {
    path: 'order/openorder',
    group: 'Pesanan',
    label: 'Open Order (Pesanan Aktif)',
    description: 'Lihat daftar pesanan yang masih berstatus open di POS.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'order/openorder/detail',
    group: 'Pesanan',
    label: 'Detail Open Order (butuh id)',
    description: 'Detail item & pembayaran satu open order berdasarkan id.',
    recommendedQuery: { id: 1 },
  },
  {
    path: 'order/closeorder',
    group: 'Pesanan',
    label: 'Close Order (Transaksi Selesai)',
    description: 'Lihat riwayat transaksi selesai berdasarkan rentang tanggal YYYY-MM-DD.',
    recommendedQuery: { start_date: '2026-11-01', end_date: '2026-11-26', per_page: 15, page: 1 },
  },
  {
    path: 'order/closeorder/detail',
    group: 'Pesanan',
    label: 'Detail Close Order (butuh id)',
    description: 'Detail item transaksi selesai berdasarkan id.',
    recommendedQuery: { id: 1 },
  },
  {
    path: 'inventory/stockopname',
    group: 'Inventori',
    label: 'Daftar Stok Opname',
    description: 'Lihat riwayat pencatatan stok opname di Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'inventory/stockmovement',
    group: 'Inventori',
    label: 'Pergerakan Stok',
    description: 'Lihat keluar-masuk stok produk dalam rentang tanggal.',
    recommendedQuery: { start_date: '2026-11-01', end_date: '2026-11-26', per_page: 15, page: 1 },
  },
  {
    path: 'report/salesdetails',
    group: 'Laporan',
    label: 'Laporan Detail Penjualan',
    description: 'Laporan detail penjualan berdasarkan rentang tanggal from & to (YYYY-MM-DD).',
    recommendedQuery: { from: '2026-11-01', to: '2026-11-26', per_page: 15, page: 1 },
  },
  {
    path: 'attendance/employee',
    group: 'Karyawan & Promo',
    label: 'Daftar Karyawan',
    description: 'Daftar data karyawan di sistem absensi Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'attendance/shift',
    group: 'Karyawan & Promo',
    label: 'Daftar Shift Kerja',
    description: 'Jadwal shift karyawan terdaftar di Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
  {
    path: 'discountvoucher',
    group: 'Karyawan & Promo',
    label: 'Daftar Voucher Diskon',
    description: 'Daftar voucher & kode promo aktif di Olsera.',
    recommendedQuery: { per_page: 15, page: 1 },
  },
] as const;

export const OLSERA_SAFE_READ_PATHS = new Set<string>(
  OLSERA_SAFE_READ_ENDPOINTS.map((e) => e.path),
);

export const OLSERA_ALLOWED_QUERY_KEYS = new Set<string>([
  'page',
  'per_page',
  'id',
  'collection_id',
  'product_id',
  'product_group_id',
  'start_date',
  'end_date',
  'from',
  'to',
  'search',
  'sort_column',
  'sort_type',
]);

export const olseraTestTokenSchema = z
  .object({
    environment: z.enum(OLSERA_ENVIRONMENTS).default('production'),
    lang: z.enum(OLSERA_LANGS).default('id'),
    grantType: z.enum(['secret_key', 'refresh_token']).default('secret_key'),
    appId: z.string().trim().max(120).optional(),
    secretKey: z.string().trim().max(240).optional(),
    refreshToken: z.string().trim().max(1000).optional(),
    bodyFormat: z.enum(['json', 'form']).default('json'),
  })
  .superRefine((val, ctx) => {
    if (val.grantType === 'secret_key') {
      if (!val.appId) {
        ctx.addIssue({ code: 'custom', path: ['appId'], message: 'App ID wajib diisi.' });
      }
      if (!val.secretKey) {
        ctx.addIssue({ code: 'custom', path: ['secretKey'], message: 'Secret Key wajib diisi.' });
      }
    } else if (!val.refreshToken) {
      ctx.addIssue({
        code: 'custom',
        path: ['refreshToken'],
        message: 'Refresh token wajib diisi untuk grant_type refresh_token.',
      });
    }
  });

export type OlseraTestTokenInput = z.infer<typeof olseraTestTokenSchema>;

export const olseraTestProbeSchema = z.object({
  environment: z.enum(OLSERA_ENVIRONMENTS).default('production'),
  lang: z.enum(OLSERA_LANGS).default('en'),
  accessToken: z.string().trim().min(10, 'Access token Olsera minimal 10 karakter').max(4000),
  path: z
    .string()
    .trim()
    .min(1, 'Path endpoint wajib dipilih')
    .max(120)
    .refine((p) => OLSERA_SAFE_READ_PATHS.has(p), {
      message: 'Endpoint ditolak: hanya endpoint GET read-only terverifikasi yang diizinkan.',
    }),
  query: z.record(z.string().trim().max(64), z.union([z.string().max(160), z.number()])).optional(),
});

export type OlseraTestProbeInput = z.infer<typeof olseraTestProbeSchema>;

export interface OlseraTestTokenResult {
  ok: boolean;
  statusCode: number;
  durationMs: number;
  endpoint: string;
  tokenType?: string;
  expiresIn?: number;
  accessToken?: string;
  refreshToken?: string;
  rawBody: unknown;
}

export interface OlseraTestProbeResult {
  ok: boolean;
  statusCode: number;
  durationMs: number;
  endpoint: string;
  safeReadOnly: true;
  itemCount?: number | null;
  rawBody: unknown;
}
