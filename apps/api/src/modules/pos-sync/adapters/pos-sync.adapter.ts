/**
 * Kontrak integrasi POS (ADR 0002). Semua akses ke Olsera HARUS lewat interface ini.
 * Implementasi aktif dipilih dengan env POS_SYNC_ADAPTER = olsera-csv | olsera-api | mock.
 */

export const POS_SYNC_ADAPTER = Symbol('POS_SYNC_ADAPTER');

export type PosAdapterName = 'olsera-csv' | 'olsera-api' | 'mock';

/** Produk dari POS setelah dinormalisasi (nama kolom asli dipetakan via pos_column_mappings). */
export interface ExternalProduct {
  externalId: string; // olsera_product_id; fallback ke SKU bila tidak ada
  sku?: string;
  name: string;
  categoryName?: string;
  price: number; // Rupiah integer
  stock?: number | null;
  isActive?: boolean;
}

export interface ExternalTransactionLine {
  externalProductId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

/** Transaksi riwayat dari POS (untuk analitik & data latih rekomendasi). */
export interface ExternalTransaction {
  externalRef: string;
  occurredAt: Date;
  paymentMethod?: string;
  total: number;
  lines: ExternalTransactionLine[];
}

export interface RowError {
  row: number;
  reason: string;
}

export interface PullResult<T> {
  items: T[];
  errors: RowError[];
}

/** Pesanan digital yang sudah lunas, siap dikirim/diekspor ke POS. */
export interface PaidOrderForPos {
  orderCode: string;
  paidAt: Date;
  tableLabel: string | null;
  paymentMethod: 'QRIS' | 'CASHIER';
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  lines: Array<{
    sku: string | null;
    olseraProductId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
  }>;
}

export type PushResult =
  | { kind: 'file'; fileName: string; content: Buffer; count: number } // CSV adapter
  | { kind: 'api'; pushed: number; failed: RowError[] }; // API adapter

export interface PullInput {
  /** Isi file untuk adapter berbasis file; diabaikan oleh adapter API. */
  file?: Buffer;
  /** { "Nama Produk": "name", ... } */
  columnMapping?: Record<string, string>;
}

export interface PosSyncAdapter {
  readonly name: PosAdapterName;
  pullProducts(input: PullInput): Promise<PullResult<ExternalProduct>>;
  pullTransactions(input: PullInput): Promise<PullResult<ExternalTransaction>>;
  pushTransactions(orders: PaidOrderForPos[]): Promise<PushResult>;
}
