# Fixtures

- `olsera-products.sample.csv` — contoh **fiktif** export produk Olsera. Kolom & format ditebak, bukan format resmi. Sengaja berisi kasus uji:
  - baris 8 (`OLS-008`): harga kosong → harus jadi `RowError`
  - baris 9 (`OLS-009`): SKU kosong & status Nonaktif
  - stok kosong → `stock = null` (tidak dilacak)
  - harga berformat `"Rp 45.000"` → `45000`

Ganti/tambah dengan contoh export asli dari mitra setelah diterima (S0-08), **setelah data sensitif dihapus**. Data transaksi asli disimpan di folder `data/` (di-gitignore), bukan di sini.
