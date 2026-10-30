# User Acceptance Test (UAT) — Matwona Smart Order

> Sumber: PRD Lampiran E. Status: Draft.

## 1. Informasi Pengujian
| Item | Isi |
|---|---|
| Versi aplikasi | |
| Lingkungan | Staging / Production |
| Lokasi | Outlet Matwona |
| Tanggal | |
| Penguji mitra | |
| Penguji tim | |

## 2. Skenario UAT
| ID | Skenario | Aktor | Langkah | Hasil yang Diharapkan | Hasil Aktual | Status | Catatan |
|---|---|---|---|---|---|---|---|
| UAT-01 | Pesan 2 item, bayar di kasir | Pelanggan, Kasir | | Pesanan tampil di kasir ≤ 2 detik; status pelanggan berubah setelah ditandai lunas | | | |
| UAT-02 | Bayar QRIS (sandbox) | Pelanggan | | Status otomatis Lunas | | | |
| UAT-03 | Tandai menu habis | Owner | | Menu tidak bisa dipesan | | | |
| UAT-04 | Impor CSV produk Olsera | Owner | | Pratinjau benar; harga sama dengan Olsera | | | |
| UAT-05 | Ekspor transaksi minggu ini | Owner | | Total CSV = dashboard | | | |
| UAT-06 | Tambah item dari rekomendasi | Pelanggan | | Item masuk keranjang; event tercatat | | | |
| UAT-07 | Lihat analitik 30 hari | Owner | | Angka sesuai data uji | | | |
| UAT-08 | Tambah meja & cetak QR | Owner | | QR baru langsung bisa dipakai | | | |

## 3. Daftar Defect
| ID | Ditemukan di | Deskripsi | Severity | Status | Diperbaiki di commit |
|---|---|---|---|---|---|

## 4. Hasil System Usability Scale (SUS)
| Responden | Peran | Skor |
|---|---|---|
| | | |
| **Rata-rata** | | **target ≥ 70** |

## 5. Metrik Keberhasilan
| Metrik | Target | Hasil |
|---|---|---|
| Waktu scan → pesanan terkonfirmasi | < 3 menit | |
| Pesanan berhasil tanpa bantuan staf | ≥ 90% | |
| Attach rate rekomendasi | ≥ 10% | |
| Selisih rekonsiliasi dengan Olsera | 0 | |

## 6. Persetujuan
| Nama | Peran | Keputusan (Diterima / Diterima dengan catatan / Ditolak) | Tanggal | Tanda tangan |
|---|---|---|---|---|
| | Owner Matwona | | | |
