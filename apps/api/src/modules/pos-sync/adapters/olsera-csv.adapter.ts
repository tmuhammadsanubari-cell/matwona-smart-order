import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type {
  ExternalProduct,
  ExternalTransaction,
  PaidOrderForPos,
  PosSyncAdapter,
  PullInput,
  PullResult,
  PushResult,
  RowError,
} from './pos-sync.adapter.js';

export const DEFAULT_PRODUCT_MAPPING: Record<string, string> = {
  'kode produk': 'externalId',
  'id produk': 'externalId',
  'product id': 'externalId',
  id: 'externalId',
  sku: 'sku',
  'kode sku': 'sku',
  'nama produk': 'name',
  nama: 'name',
  'product name': 'name',
  kategori: 'categoryName',
  category: 'categoryName',
  'harga jual': 'price',
  harga: 'price',
  price: 'price',
  stok: 'stock',
  stock: 'stock',
  qty: 'stock',
  status: 'isActive',
  aktif: 'isActive',
};

/** Normalisasi nominal Rupiah: "Rp 45.000", "45000", "45.000,00" -> 45000 */
export function parseRupiah(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Hapus "Rp", spasi, pemisah ribuan titik
  const cleaned = str
    .replace(/^rp\.?\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,.*$/, ''); // buang desimal sen
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

/**
 * Adapter sinkronisasi POS berbasis file CSV Olsera (ADR 0002, FR-013, FR-014).
 */
export class OlseraCsvAdapter implements PosSyncAdapter {
  readonly name = 'olsera-csv' as const;

  async pullProducts(input: PullInput): Promise<PullResult<ExternalProduct>> {
    if (!input.file || input.file.length === 0) {
      return { items: [], errors: [{ row: 0, reason: 'File CSV kosong atau tidak ada' }] };
    }

    let records: Array<Record<string, string>>;
    try {
      records = parse(input.file, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { items: [], errors: [{ row: 0, reason: `Format CSV tidak valid: ${msg}` }] };
    }

    const mapping = input.columnMapping ?? DEFAULT_PRODUCT_MAPPING;
    // Map lowercase mapping keys for robust lookup
    const normalizedMap = new Map<string, string>();
    for (const [k, v] of Object.entries(mapping)) {
      normalizedMap.set(k.trim().toLowerCase(), v);
    }

    const items: ExternalProduct[] = [];
    const errors: RowError[] = [];
    const seenSkus = new Set<string>();

    for (const [idx, record] of records.entries()) {
      const rowNum = idx + 2; // baris 1 header
      const mapped: Record<string, string> = {};

      for (const [header, val] of Object.entries(record)) {
        const targetField = normalizedMap.get(header.trim().toLowerCase());
        if (targetField) {
          mapped[targetField] = val;
        }
      }

      const name = (mapped.name ?? '').trim();
      if (!name) {
        errors.push({ row: rowNum, reason: 'Nama produk kosong' });
        continue;
      }

      const price = parseRupiah(mapped.price);
      if (price === null) {
        errors.push({ row: rowNum, reason: 'Harga kosong atau tidak valid' });
        continue;
      }

      const sku = (mapped.sku ?? '').trim() || undefined;
      if (sku) {
        if (seenSkus.has(sku)) {
          errors.push({ row: rowNum, reason: `SKU duplikat: ${sku}` });
          continue;
        }
        seenSkus.add(sku);
      }

      const externalId = (mapped.externalId ?? '').trim() || sku || name;

      let stock: number | null = null;
      if (mapped.stock !== undefined && String(mapped.stock).trim() !== '') {
        const parsedStock = Number(String(mapped.stock).trim());
        if (Number.isFinite(parsedStock)) {
          stock = Math.max(0, Math.floor(parsedStock));
        }
      }

      let isActive = true;
      if (mapped.isActive !== undefined) {
        const actStr = String(mapped.isActive).trim().toLowerCase();
        if (actStr === 'nonaktif' || actStr === 'inactive' || actStr === 'false' || actStr === '0') {
          isActive = false;
        }
      }

      items.push({
        externalId,
        sku,
        name,
        categoryName: (mapped.categoryName ?? '').trim() || undefined,
        price,
        stock,
        isActive,
      });
    }

    return { items, errors };
  }

  async pullTransactions(input: PullInput): Promise<PullResult<ExternalTransaction>> {
    if (!input.file || input.file.length === 0) {
      return { items: [], errors: [{ row: 0, reason: 'File CSV kosong atau tidak ada' }] };
    }

    let records: Array<Record<string, string>>;
    try {
      records = parse(input.file, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { items: [], errors: [{ row: 0, reason: `Format CSV tidak valid: ${msg}` }] };
    }

    const txMap = new Map<string, ExternalTransaction>();
    const errors: RowError[] = [];

    for (const [idx, record] of records.entries()) {
      const rowNum = idx + 2;
      const ref = (record['kode_pesanan'] ?? record['ref'] ?? record['no_transaksi'] ?? '').trim();
      if (!ref) {
        errors.push({ row: rowNum, reason: 'Nomor transaksi/kode pesanan kosong' });
        continue;
      }

      const name = (record['item'] ?? record['nama_produk'] ?? '').trim();
      const qty = Number(record['qty'] ?? 1) || 1;
      const price = parseRupiah(record['harga'] ?? record['unit_price']) ?? 0;
      const discount = parseRupiah(record['diskon']) ?? 0;
      const total = parseRupiah(record['total']) ?? price * qty - discount;

      let tx = txMap.get(ref);
      if (!tx) {
        const occurredAt = record['tanggal'] ? new Date(record['tanggal']) : new Date();
        tx = {
          externalRef: ref,
          occurredAt: isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
          paymentMethod: record['metode_bayar'] ?? record['payment_method'],
          total: 0,
          lines: [],
        };
        txMap.set(ref, tx);
      }

      tx.lines.push({
        sku: record['sku']?.trim() || undefined,
        externalProductId: record['id_produk']?.trim() || undefined,
        name: name || 'Item',
        quantity: qty,
        unitPrice: price,
        discountAmount: discount,
      });
      tx.total += total;
    }

    return { items: Array.from(txMap.values()), errors };
  }

  async pushTransactions(orders: PaidOrderForPos[]): Promise<PushResult> {
    const rows = orders.flatMap((o) =>
      o.lines.map((l) => ({
        kode_pesanan: o.orderCode,
        tanggal: o.paidAt.toISOString().slice(0, 19).replace('T', ' '),
        meja: o.tableLabel ?? 'Tanpa Meja',
        item: l.name,
        qty: l.quantity,
        harga: l.unitPrice,
        diskon: l.discountAmount,
        total: l.lineTotal,
        metode_bayar: o.paymentMethod,
      })),
    );

    const csvContent = stringify(rows, {
      header: true,
      columns: ['kode_pesanan', 'tanggal', 'meja', 'item', 'qty', 'harga', 'diskon', 'total', 'metode_bayar'],
    });

    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `matwona_transaksi_${ymd}.csv`;

    return {
      kind: 'file',
      fileName,
      content: Buffer.from(csvContent, 'utf-8'),
      count: orders.length,
    };
  }
}
