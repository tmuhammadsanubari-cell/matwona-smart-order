import { posColumnMappingSchema } from 'shared';
import { buildMappingRows, mergeMapping, readCsvHeaders, validateMappingRows } from './pos-sync-mapping';
import { fileNameFromDisposition } from './staff-download';

describe('readCsvHeaders (FR-013)', () => {
  it('membaca judul kolom dari baris pertama, termasuk kolom berkutip & BOM', () => {
    const csv = '﻿Kode Produk,"Nama, Produk",Harga Jual\r\nOLS-1,"Tuna, Sambal","Rp 45.000"';
    expect(readCsvHeaders(csv)).toEqual(['Kode Produk', 'Nama, Produk', 'Harga Jual']);
  });

  it('melewati baris kosong di awal, kolom kosong, dan judul ganda', () => {
    expect(readCsvHeaders('\n\nSKU, Nama ,,sku\n1,a')).toEqual(['SKU', 'Nama']);
  });

  it('file kosong → tanpa judul', () => {
    expect(readCsvHeaders('')).toEqual([]);
  });
});

describe('buildMappingRows', () => {
  it('mengisi field dari mapping tersimpan tanpa beda huruf besar/kecil; sisanya diabaikan', () => {
    const rows = buildMappingRows(['Nama Produk', 'HARGA JUAL', 'Catatan'], { 'nama produk': 'name', 'harga jual': 'price', catatan: 'bukan-field' });
    expect(rows).toEqual([
      { header: 'Nama Produk', field: 'name' },
      { header: 'HARGA JUAL', field: 'price' },
      { header: 'Catatan', field: '' },
    ]);
  });
});

describe('validateMappingRows', () => {
  it('nama & harga wajib dipetakan', () => {
    expect(validateMappingRows([{ header: 'SKU', field: 'sku' }])).toEqual([
      'Pilih kolom untuk field "Nama".',
      'Pilih kolom untuk field "Harga".',
    ]);
  });

  it('satu field tidak boleh dipakai dua kolom', () => {
    const problems = validateMappingRows([
      { header: 'Nama', field: 'name' },
      { header: 'Nama Produk', field: 'name' },
      { header: 'Harga', field: 'price' },
    ]);
    expect(problems).toEqual(['Field "Nama" dipakai lebih dari satu kolom: Nama, Nama Produk.']);
  });

  it('pemetaan lengkap → tanpa masalah', () => {
    expect(validateMappingRows([{ header: 'Nama', field: 'name' }, { header: 'Harga', field: 'price' }, { header: 'X', field: '' }])).toEqual([]);
  });
});

describe('mergeMapping', () => {
  it('mengganti entri kolom file ini, mempertahankan alias lain, dan lolos skema shared', () => {
    const saved = { 'nama produk': 'name', harga: 'price', 'harga jual': 'price', aneh: 'tidak-valid' };
    const merged = mergeMapping(saved, [
      { header: 'Nama Produk', field: 'name' },
      { header: 'Harga Jual', field: '' },
      { header: 'Harga Promo', field: 'price' },
    ]);
    expect(merged).toEqual({ harga: 'price', 'Nama Produk': 'name', 'Harga Jual': '', 'Harga Promo': 'price' });
    expect(posColumnMappingSchema.safeParse(merged).success).toBe(true);
  });
});

describe('posColumnMappingSchema (PUT /pos-sync/mapping)', () => {
  it('menolak field tujuan yang tidak dikenal & judul kolom kosong', () => {
    expect(posColumnMappingSchema.safeParse({ Nama: 'nama' }).success).toBe(false);
    expect(posColumnMappingSchema.safeParse({ ' ': 'name' }).success).toBe(false);
  });
});

describe('fileNameFromDisposition', () => {
  it('mengambil nama file dari header', () => {
    expect(fileNameFromDisposition('attachment; filename="matwona_transaksi_20261124.csv"')).toBe('matwona_transaksi_20261124.csv');
    expect(fileNameFromDisposition(null)).toBeUndefined();
  });
});
