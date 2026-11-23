import { z } from 'zod';

// Sumber: PRD 2.2.10 (FR-013, FR-014) & tabel pos_column_mappings / pos_sync_logs (4.2)

/** Field produk Smart Order yang bisa menjadi tujuan kolom CSV Olsera. */
export const POS_PRODUCT_FIELDS = ['externalId', 'sku', 'name', 'categoryName', 'price', 'stock', 'isActive'] as const;
export type PosProductField = (typeof POS_PRODUCT_FIELDS)[number];

/** Field yang wajib dipetakan agar satu baris CSV bisa menjadi produk. */
export const POS_REQUIRED_PRODUCT_FIELDS = ['name', 'price'] as const satisfies readonly PosProductField[];

export const POS_PRODUCT_FIELD_LABEL: Record<PosProductField, string> = {
  externalId: 'ID Produk Olsera',
  sku: 'SKU',
  name: 'Nama',
  categoryName: 'Kategori',
  price: 'Harga',
  stock: 'Stok',
  isActive: 'Status Aktif',
};

export const POS_MAPPING_ENTITIES = ['PRODUCT', 'HISTORY_IMPORT'] as const;
export type PosMappingEntity = (typeof POS_MAPPING_ENTITIES)[number];

/**
 * Pemetaan `{ "Nama Produk": "name" }`: kunci = judul kolom CSV (dicocokkan tanpa beda huruf besar/kecil),
 * nilai = field tujuan, atau "" untuk kolom yang sengaja diabaikan.
 */
export const posColumnMappingSchema = z
  .record(z.string().trim().min(1, 'Nama kolom CSV wajib diisi').max(100), z.union([z.enum(POS_PRODUCT_FIELDS), z.literal('')]))
  .refine((mapping) => Object.keys(mapping).length <= 200, 'Pemetaan maksimal 200 kolom');
export type PosColumnMapping = z.infer<typeof posColumnMappingSchema>;

/** PUT /pos-sync/mapping */
export const savePosMappingSchema = z.object({
  entity: z.enum(POS_MAPPING_ENTITIES).default('PRODUCT'),
  mapping: posColumnMappingSchema,
});
export type SavePosMappingInput = z.infer<typeof savePosMappingSchema>;

/** Satu baris pratinjau impor produk. */
export interface PosSyncDiffRow {
  name: string;
  categoryName?: string;
  sku?: string;
  status: 'new' | 'changed' | 'unchanged';
  oldPrice?: number;
  newPrice: number;
}

export interface PosSyncRowError {
  row: number;
  reason: string;
}

/** Respons POST /pos-sync/preview. */
export interface PosSyncPreviewDto {
  logId: string;
  fileName?: string;
  summary: { newCount: number; changedCount: number; unchangedCount: number; errorCount: number };
  diff: PosSyncDiffRow[];
  errors: PosSyncRowError[];
}

export type PosSyncStatus = 'PREVIEW' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

/** Satu entri GET /pos-sync/history (pos_sync_logs, FR-014). */
export interface PosSyncLogDto {
  id: string;
  createdAt: string;
  direction: string;
  entity: string;
  status: PosSyncStatus;
  successCount: number;
  failedCount: number;
  fileName: string | null;
  userName: string;
}
