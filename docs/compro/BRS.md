# Business Requirement Specification (BRS) — Matwona Smart Order

> Sumber: PRD 1.1–1.4, 1.7, Lampiran F, notulen mitra. Status: Draft.

## 1. Pendahuluan
### 1.1 Tujuan Dokumen
### 1.2 Ruang Lingkup Bisnis
### 1.3 Definisi & Singkatan

## 2. Profil Mitra
- Nama usaha: Matwona
- Bidang: rumah makan spesialis tuna & ayam kampung, konsep open kitchen
- Jumlah outlet: 1 (Bandung)
- Sistem yang dipakai saat ini: Olsera POS
- Narahubung mitra: _(isi)_

## 3. Proses Bisnis Saat Ini (As-Is)
_(Diagram alur pemesanan manual: pelanggan → kasir/pelayan → dapur → pembayaran → Olsera. Isi dari hasil wawancara/observasi.)_

### 3.1 Permasalahan yang Ditemukan
_(Ambil dari PRD 1.2 "Masalah yang Dipecahkan", lengkapi dengan bukti observasi: waktu antre, kesalahan catat, dll.)_

## 4. Proses Bisnis Usulan (To-Be)
_(Alur: scan QR → pesan → bayar QRIS/kasir → kasir teruskan ke dapur → sinkron Olsera → analitik.)_

## 5. Stakeholder
| Stakeholder | Kepentingan | Keterlibatan |
|---|---|---|
| Owner Matwona | Omzet, efisiensi, data penjualan | Narasumber, validator, UAT |
| Kasir | Kemudahan menerima pesanan & pembayaran | Pengguna dashboard kasir, UAT |
| Pelanggan | Pesan cepat tanpa antre | Pengguna menu digital, responden SUS |
| Dosen Pendamping | Kesesuaian dengan kriteria ComPro | Pembimbing & penilai |
| Olsera | Penyedia POS | Pihak integrasi (akses API) |

## 6. Kebutuhan Bisnis
| ID | Kebutuhan Bisnis | Prioritas | FR Terkait |
|---|---|---|---|
| BR-01 | Pelanggan dapat memesan dari meja tanpa antre | Tinggi | FR-001…004 |
| BR-02 | Pembayaran dapat online (QRIS) maupun di kasir | Tinggi | FR-005, FR-006 |
| BR-03 | Kasir menerima pesanan seketika | Tinggi | FR-008 |
| BR-04 | Matwona memiliki kanal informasi online | Tinggi | FR-012 |
| BR-05 | Data menu & transaksi selaras dengan Olsera | Tinggi | FR-013, FR-014 |
| BR-06 | Meningkatkan nilai transaksi rata-rata | Sedang | FR-015, FR-016 |
| BR-07 | Owner mendapat insight penjualan | Sedang | FR-017…019 |
| BR-08 | Owner dapat menjalankan promo | Sedang | FR-020 |

## 7. Batasan & Asumsi Bisnis
_(PRD 1.7)_

## 8. Manfaat yang Diharapkan & Ukuran Keberhasilan
_(PRD 1.2 Tujuan + Lampiran E metrik keberhasilan)_

## 9. Persetujuan Mitra
| Nama | Jabatan | Tanggal | Tanda tangan |
|---|---|---|---|
| | Owner Matwona | | |
