import { describe, expect, it } from 'vitest';
import { OlseraCsvAdapter, parseRupiah } from './olsera-csv.adapter.js';

describe('OlseraCsvAdapter', () => {
  const adapter = new OlseraCsvAdapter();

  describe('parseRupiah', () => {
    it('mengubah string berformat Rupiah menjadi integer', () => {
      expect(parseRupiah('Rp 45.000')).toBe(45000);
      expect(parseRupiah('45000')).toBe(45000);
      expect(parseRupiah('Rp. 19.500,00')).toBe(19500);
      expect(parseRupiah('')).toBeNull();
      expect(parseRupiah(null)).toBeNull();
    });
  });

  describe('pullProducts', () => {
    it('mengimpor produk valid dan mendeteksi error baris tidak valid', async () => {
      const csv = `Kode Produk,SKU,Nama Produk,Kategori,Harga Jual,Stok,Status
OLS-001,TN-SMT,Tuna Sambal Matah,Olahan Tuna,"Rp 45.000",30,Aktif
OLS-002,TN-GPK,Tuna Geprek,Olahan Tuna,"Rp 38.000",25,Aktif
OLS-008,MN-EJR,Es Jeruk,Minuman,,40,Aktif
OLS-009,TN-SMT,Duplikat SKU,Olahan Tuna,"Rp 20.000",10,Aktif
OLS-010,TB-NSP,,Tambahan,"Rp 6.000",,Aktif`;

      const res = await adapter.pullProducts({ file: Buffer.from(csv) });
      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toEqual({
        externalId: 'OLS-001',
        sku: 'TN-SMT',
        name: 'Tuna Sambal Matah',
        categoryName: 'Olahan Tuna',
        price: 45000,
        stock: 30,
        isActive: true,
      });

      // Errors: row 4 (OLS-008 harga kosong), row 5 (OLS-009 SKU duplikat), row 6 (OLS-010 nama kosong)
      expect(res.errors).toHaveLength(3);
      expect(res.errors[0]?.reason).toContain('Harga kosong');
      expect(res.errors[1]?.reason).toContain('SKU duplikat');
      expect(res.errors[2]?.reason).toContain('Nama produk kosong');
    });

    it('mendukung pemetaan kolom kustom', async () => {
      const csv = `Item Name,SKU Code,Price,Cat
Tuna Mayo,TN-MYO,17000,Non-Spicy`;

      const res = await adapter.pullProducts({
        file: Buffer.from(csv),
        columnMapping: {
          'Item Name': 'name',
          'SKU Code': 'sku',
          Price: 'price',
          Cat: 'categoryName',
        },
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.name).toBe('Tuna Mayo');
      expect(res.items[0]?.price).toBe(17000);
      expect(res.items[0]?.categoryName).toBe('Non-Spicy');
    });
  });

  describe('pushTransactions', () => {
    it('menghasilkan CSV transaksi sesuai kolom Olsera', async () => {
      const res = await adapter.pushTransactions([
        {
          orderCode: 'MTW-261111-0001',
          paidAt: new Date('2026-11-11T12:00:00Z'),
          tableLabel: 'A3',
          paymentMethod: 'CASHIER',
          subtotalAmount: 19000,
          discountAmount: 0,
          totalAmount: 19000,
          lines: [
            {
              sku: 'TN-SMT-R',
              olseraProductId: 'OLS-TN-01',
              name: 'Tuna Sambal Matah (Reguler)',
              quantity: 1,
              unitPrice: 19000,
              discountAmount: 0,
              lineTotal: 19000,
            },
          ],
        },
      ]);

      expect(res.kind).toBe('file');
      if (res.kind === 'file') {
        const text = res.content.toString('utf-8');
        expect(text).toContain('kode_pesanan,tanggal,meja,item,qty,harga,diskon,total,metode_bayar');
        expect(text).toContain('MTW-261111-0001');
        expect(text).toContain('Tuna Sambal Matah (Reguler)');
        expect(text).toContain('19000');
      }
    });
  });
});
