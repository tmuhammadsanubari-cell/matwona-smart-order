import type {
  ExternalProduct,
  ExternalTransaction,
  PaidOrderForPos,
  PosSyncAdapter,
  PullInput,
  PullResult,
  PushResult,
} from './pos-sync.adapter.js';

/**
 * Adapter aktif selama API Olsera belum tersedia (ADR 0002).
 *
 * TODO [S2-07, FR-013]:
 *  - pullProducts: parse CSV (csv-parse, delimiter auto `,`/`;`, BOM), terapkan columnMapping,
 *    normalisasi harga "Rp 45.000" → 45000, kumpulkan RowError per baris.
 *  - pullTransactions [S2-09]: kelompokkan baris per nomor transaksi → ExternalTransaction.
 *  - pushTransactions [S2-08]: hasilkan CSV (csv-stringify) satu baris per item pesanan.
 * Format kolom final menunggu contoh export asli dari mitra; sementara pakai
 * test/fixtures/olsera-products.sample.csv (fiktif).
 */
export class OlseraCsvAdapter implements PosSyncAdapter {
  readonly name = 'olsera-csv' as const;

  async pullProducts(_input: PullInput): Promise<PullResult<ExternalProduct>> {
    throw new Error('Belum diimplementasikan (S2-07)');
  }

  async pullTransactions(_input: PullInput): Promise<PullResult<ExternalTransaction>> {
    throw new Error('Belum diimplementasikan (S2-09)');
  }

  async pushTransactions(_orders: PaidOrderForPos[]): Promise<PushResult> {
    throw new Error('Belum diimplementasikan (S2-08)');
  }
}
