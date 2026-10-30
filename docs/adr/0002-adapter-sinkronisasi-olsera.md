# ADR 0002 — Pola Adapter untuk Sinkronisasi Olsera

- **Status:** Diterima
- **Tanggal:** 30 Oktober 2026

## Konteks

Mitra memakai Olsera sebagai POS dan meminta sinkronisasi menu, harga, stok, dan transaksi. Per 30 Oktober 2026 tim **belum memiliki akses API Olsera**, dan dokumentasi API publik belum ditemukan. Format kolom file export backoffice Olsera juga belum diketahui pasti.

## Keputusan

- Semua interaksi dengan POS melalui interface `PosSyncAdapter` (`apps/api/src/modules/pos-sync/adapters/pos-sync.adapter.ts`).
- Implementasi:
  - `OlseraCsvAdapter` (aktif): impor file export produk & riwayat transaksi, ekspor CSV transaksi pesanan digital.
  - `MockOlseraAdapter`: data dummy untuk test otomatis dan demo tanpa file mitra.
  - `OlseraApiAdapter` (FR-023, Could): diimplementasikan bila akses API diberikan.
- Adapter dipilih lewat env `POS_SYNC_ADAPTER`.
- Pemetaan kolom CSV disimpan di tabel `pos_column_mappings` dan bisa diubah admin, sehingga perubahan format tidak butuh deploy ulang.
- Olsera adalah sumber kebenaran master data; impor menimpa nama, harga, dan stok. Item yang hilang dari file tidak dihapus, hanya ditandai untuk ditinjau.
- Impor selalu melalui tahap **pratinjau** sebelum diterapkan.

## Konsekuensi

- (+) Proyek tidak terblokir oleh akses API; nilai integrasi tetap bisa didemonstrasikan.
- (+) Mengganti ke API hanya menyentuh satu kelas.
- (−) Sinkronisasi prototipe tidak realtime; stok di menu digital adalah snapshot terakhir impor ditambah pengurangan dari pesanan digital.
- (−) Jika Olsera tidak mendukung impor transaksi, CSV ekspor hanya untuk rekonsiliasi dan kasir tetap mencatat transaksi di Olsera (risiko R-01 PRD).
