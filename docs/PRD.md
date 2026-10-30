# 📄 Matwona Smart Order — Product Requirement Document

> **Versi:** 1.1
> **Tanggal:** 30 Oktober 2026
> **Author:** Tim Computing Project (disusun dengan bantuan AI)
> **Status:** Draft
> **Bahasa Dokumen:** Bahasa Indonesia
> **Mata Kuliah:** CAK4CAC3 Computing Project, Prodi S-1 Informatika, Telkom University
> **Mitra:** Matwona (rumah makan spesialis tuna & ayam kampung)

---

## Daftar Isi

1. [Overview & Requirements](#1-overview--requirements)
2. [Fitur Utama](#2-fitur-utama)
3. [Diagram Visual](#3-diagram-visual)
4. [Arahan Teknis](#4-arahan-teknis-technical-guidelines)
5. [Lampiran A: Pemetaan ke Komponen Penilaian Computing Project](#lampiran-a-pemetaan-ke-komponen-penilaian-computing-project)
6. [Lampiran B: Rencana Sprint & Timeline](#lampiran-b-rencana-sprint--timeline)
7. [Lampiran C: Pembagian Peran Tim](#lampiran-c-pembagian-peran-tim)
8. [Lampiran D: Risiko & Mitigasi](#lampiran-d-risiko--mitigasi)
9. [Lampiran E: Strategi Pengujian & UAT](#lampiran-e-strategi-pengujian--uat)
10. [Lampiran F: Ringkasan Business Plan & Roadmap Produk](#lampiran-f-ringkasan-business-plan--roadmap-produk)
11. [Lampiran G: Pertanyaan Terbuka untuk Mitra](#lampiran-g-pertanyaan-terbuka-untuk-mitra)

---

## 1. Overview & Requirements

### 1.1 Gambaran Umum Proyek

**Nama Proyek:** Matwona Smart Order
**Deskripsi Singkat:** Sistem pemesanan digital berbasis QR meja untuk Matwona. Pelanggan memesan dan membayar langsung dari ponsel, pesanan masuk realtime ke kasir, data tersinkron dengan sistem kasir Olsera, dan owner mendapat rekomendasi menu berbasis AI serta dashboard analitik penjualan.
**Jenis Aplikasi:** Web App (PWA, mobile-first untuk pelanggan, desktop/tablet untuk kasir & admin)

Produk terdiri dari empat bagian dalam satu sistem:

| Bagian | Pengguna | Ringkasan |
|--------|----------|-----------|
| Landing Page | Publik / calon pelanggan | Profil usaha, menu, lokasi, promo |
| Menu Digital (QR Meja) | Pelanggan (tamu) | Scan QR → lihat menu + rekomendasi → pesan → bayar QRIS atau di kasir |
| Dashboard Kasir | Kasir | Antrean pesanan realtime, konfirmasi, tandai lunas |
| Dashboard Admin/Owner | Owner | Kelola menu, meja & QR, promo, staf, sinkronisasi Olsera, analitik penjualan |

### 1.2 Latar Belakang & Tujuan

Matwona adalah rumah makan dengan konsep *small, lively food house* dan open kitchen yang menyajikan olahan tuna dan ayam kampung (sumber: Brand Guideline Matwona). Saat ini outlet baru satu dan sudah memakai Olsera sebagai sistem kasir. Berdasarkan notulensi dengan mitra, ada tiga kebutuhan: menu digital dengan scan meja dan checkout ke kasir, landing page, dan integrasi dengan sistem kasir Olsera.

**Masalah yang Dipecahkan:**
- Pemesanan manual (pelanggan antre ke kasir atau memanggil pelayan) memperlambat layanan saat jam ramai dan rawan salah catat.
- Menu fisik sulit diperbarui ketika harga berubah atau stok habis, sehingga pelanggan bisa memesan menu yang tidak tersedia.
- Matwona belum punya kanal online resmi (landing page) untuk menampilkan profil, menu, lokasi, dan promo.
- Owner belum memanfaatkan data transaksi untuk keputusan bisnis: menu mana yang laris, jam ramai, dan kombinasi menu yang sering dibeli bersama.
- Pesanan digital dan transaksi di Olsera berpotensi tidak sinkron jika dicatat terpisah.

**Tujuan Utama:**
- Memangkas waktu dari pelanggan duduk sampai pesanan terkonfirmasi kasir menjadi < 3 menit.
- Menyediakan dua opsi pembayaran: QRIS online dan bayar di kasir.
- Menampilkan menu yang selalu akurat (harga & ketersediaan) karena bersumber dari data yang tersinkron dengan Olsera.
- Meningkatkan nilai rata-rata transaksi (AOV) melalui rekomendasi menu berbasis AI.
- Memberi owner dashboard analitik penjualan untuk keputusan menu dan operasional.

### 1.3 Target Pengguna

| Peran | Deskripsi | Kebutuhan Utama |
|-------|-----------|-----------------|
| Pelanggan (Tamu) | Pengunjung yang makan di tempat, memesan via ponsel tanpa login | Menu jelas dengan foto & harga, pesan cepat, bayar fleksibel, tahu status pesanan |
| Pengunjung Landing Page | Calon pelanggan yang mencari info Matwona di internet | Info profil, menu, lokasi (peta), promo terbaru |
| Kasir | Staf yang menerima pesanan dan pembayaran | Notifikasi pesanan realtime, konfirmasi cepat, tandai pembayaran tunai/di kasir |
| Admin/Owner | Pemilik Matwona | Kelola menu/meja/promo/staf, sinkronisasi Olsera, lihat analitik & performa rekomendasi |

> Catatan: pesanan diteruskan ke dapur secara **manual** oleh kasir, sehingga tidak ada role Dapur dan tidak ada Kitchen Display System pada versi ini.

### 1.4 Ruang Lingkup (Scope)

**Dalam Scope:**
- Landing page publik (profil, menu, lokasi, promo) dengan SEO dasar.
- Menu digital via QR per meja, keranjang, catatan per item, checkout sebagai tamu.
- Pembayaran QRIS via Midtrans (mode sandbox untuk prototipe) dan opsi bayar di kasir.
- Halaman status pesanan untuk pelanggan (realtime).
- Dashboard kasir realtime (WebSocket) dengan notifikasi suara.
- Dashboard admin: CRUD kategori & menu, toggle ketersediaan, stok, manajemen meja + generate & cetak QR, promo, akun staf.
- Rekomendasi menu berbasis AI (association rules + popularitas per jam).
- Dashboard analitik penjualan (tren, menu terlaris, jam ramai, menu engineering, performa rekomendasi).
- Sinkronisasi data dengan Olsera (menu, harga, stok, transaksi) melalui **adapter layer**: implementasi CSV import/export untuk prototipe, siap diganti adapter API saat akses tersedia.
- Deployment cloud dan dokumentasi (BRS, SRS, SDD, UAT, user guide).

**Di Luar Scope:**
- Kitchen Display System dan role Dapur.
- Aplikasi native Android/iOS (cukup PWA).
- Login/akun pelanggan, program loyalitas, poin member.
- Pesan antar (delivery) dan takeaway online dari luar outlet.
- Manajemen bahan baku/resep (inventory level bahan).
- Multi-outlet dan multi-tenant (struktur data disiapkan, fitur belum diaktifkan).
- Integrasi API Olsera dua arah realtime (bergantung akses dari Olsera; lihat Lampiran D).
- Settlement pembayaran produksi Midtrans (prototipe memakai sandbox kecuali mitra menyediakan akun produksi).

### 1.5 Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas | Deskripsi |
|----|-----------|-----------|-----------|
| FR-001 | Scan QR meja | Must Have | Pelanggan scan QR unik per meja dan diarahkan ke menu digital dengan nomor meja terdeteksi otomatis |
| FR-002 | Lihat menu digital | Must Have | Menu tampil per kategori dengan foto, deskripsi, harga, label habis, dan pencarian |
| FR-003 | Keranjang & catatan | Must Have | Tambah/kurangi item, catatan per item (mis. "tidak pedas"), ringkasan total |
| FR-004 | Checkout sebagai tamu | Must Have | Isi nama (wajib) dan no. HP (opsional), pilih metode bayar, buat pesanan |
| FR-005 | Pembayaran QRIS | Must Have | Membuat transaksi QRIS via Midtrans dan memperbarui status lewat webhook |
| FR-006 | Bayar di kasir | Must Have | Pesanan dibuat dengan status belum bayar; kasir menandai lunas setelah menerima pembayaran |
| FR-007 | Status pesanan pelanggan | Must Have | Halaman status pesanan yang diperbarui realtime |
| FR-008 | Dashboard kasir realtime | Must Have | Pesanan baru muncul < 2 detik dengan notifikasi suara; kasir mengubah status pesanan |
| FR-009 | Login staf & RBAC | Must Have | Login kasir/admin; akses dibatasi sesuai role |
| FR-010 | Manajemen menu | Must Have | CRUD kategori & menu, upload foto, harga, stok, toggle tersedia/habis |
| FR-011 | Manajemen meja & QR | Must Have | CRUD meja, generate/regenerate token QR, unduh PDF QR siap cetak |
| FR-012 | Landing page | Must Have | Halaman publik: profil, menu (read-only), lokasi (peta), promo aktif |
| FR-013 | Sinkronisasi Olsera (CSV) | Must Have | Impor master produk (nama, kategori, harga, stok, SKU) dari file export Olsera; ekspor transaksi pesanan digital ke CSV |
| FR-014 | Log sinkronisasi | Must Have | Riwayat setiap proses sinkron: waktu, arah, jumlah baris sukses/gagal, pesan error |
| FR-015 | Rekomendasi "sering dibeli bersama" | Must Have | Menampilkan rekomendasi item berdasarkan isi keranjang (association rules) |
| FR-016 | Rekomendasi "populer sekarang" | Should Have | Menampilkan menu populer pada slot jam saat ini; juga menjadi fallback cold start |
| FR-017 | Dashboard analitik penjualan | Must Have | Omzet, jumlah pesanan, AOV, tren harian/mingguan/bulanan, menu terlaris, jam ramai |
| FR-018 | Menu engineering | Should Have | Klasifikasi menu ke Star/Plowhorse/Puzzle/Dog berdasarkan popularitas & kontribusi omzet |
| FR-019 | Performa rekomendasi | Should Have | Impression, klik, add-to-cart dari rekomendasi, dan attach rate |
| FR-020 | Manajemen promo | Should Have | CRUD promo (persentase/nominal, periode aktif, item terkait) yang tampil di landing & menu |
| FR-021 | Manajemen akun staf | Should Have | Admin membuat, menonaktifkan, dan reset password akun kasir |
| FR-022 | Retrain model rekomendasi | Should Have | Training ulang terjadwal harian dan tombol manual di dashboard admin |
| FR-023 | Adapter API Olsera | Could Have | Implementasi `OlseraApiAdapter` jika akses API diberikan oleh Olsera |
| FR-024 | Cetak struk/ringkasan pesanan | Could Have | Kasir mencetak ringkasan pesanan untuk diteruskan ke dapur |
| FR-025 | Panggil pelayan | Won't Have (v1) | Tombol "panggil pelayan" dari meja; masuk roadmap v2 |

### 1.6 Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan | Detail |
|----|----------|-----------|--------|
| NFR-001 | Performa | Halaman menu cepat di jaringan seluler | LCP ≤ 2,5 detik pada simulasi 4G (Lighthouse mobile), skor Performance ≥ 80 |
| NFR-002 | Performa | Latensi pesanan ke kasir rendah | Event `order.created` diterima dashboard kasir ≤ 2 detik setelah pesanan dibuat |
| NFR-003 | Performa | API responsif | p95 response time ≤ 500 ms untuk endpoint publik (menu, order) pada 50 pengguna konkuren |
| NFR-004 | Performa | Rekomendasi cepat | Endpoint rekomendasi ≤ 300 ms (rules sudah di-precompute) |
| NFR-005 | Keamanan | Transport terenkripsi | Seluruh trafik via HTTPS; cookie `Secure`, `HttpOnly`, `SameSite=Lax` |
| NFR-006 | Keamanan | Autentikasi & otorisasi staf | Password di-hash bcrypt (cost 12); JWT access 15 menit + refresh 7 hari; RBAC per endpoint |
| NFR-007 | Keamanan | Integritas harga | Harga & total selalu dihitung ulang di server dari database; harga dari klien diabaikan |
| NFR-008 | Keamanan | Validasi webhook pembayaran | Signature Midtrans diverifikasi; webhook idempoten (notifikasi duplikat tidak mengubah status dua kali) |
| NFR-009 | Keamanan | Anti-spam pesanan | Rate limit pembuatan pesanan: maks. 5 pesanan / 10 menit per token meja dan per IP |
| NFR-010 | Keamanan | Token meja tidak bisa ditebak | Token QR acak 128-bit (base62); bisa di-regenerate jika QR bocor |
| NFR-011 | Privasi | Data pelanggan minimal | Hanya nama dan no. HP opsional; tidak menyimpan data kartu; no. HP disamarkan di tampilan kasir |
| NFR-012 | Usability | Mobile-first | Layout benar mulai lebar 360 px; target sentuh ≥ 44 px; alur pesan ≤ 4 langkah |
| NFR-013 | Usability | Kepuasan pengguna | Skor System Usability Scale (SUS) ≥ 70 pada UAT |
| NFR-014 | Aksesibilitas | Kontras warna brand | Teks normal memakai kombinasi kontras ≥ 4,5:1 (lihat 4.9) |
| NFR-015 | Skalabilitas | Layanan stateless | API & AI service berjalan sebagai container stateless; WebSocket memakai Redis adapter agar bisa scale horizontal |
| NFR-016 | Skalabilitas | Siap multi-outlet | Semua tabel bisnis memiliki `outlet_id` |
| NFR-017 | Ketersediaan | Stabil saat demo & exhibition | Uptime ≥ 99% selama minggu 15–16; health check endpoint `/health` |
| NFR-018 | Maintainability | Kualitas kode | ESLint + Prettier (TS), Ruff (Python); coverage unit test ≥ 60% pada modul orders, payments, pos-sync, recommendation |
| NFR-019 | Maintainability | Version control | Git dengan branch `main`/`develop`/`feature/*`, PR wajib di-review 1 anggota, CI menjalankan lint & test |
| NFR-020 | Reliabilitas | Toleran kegagalan AI | Jika AI service gagal/timeout, menu tetap berjalan dan rekomendasi jatuh ke "menu terlaris" |

### 1.7 Asumsi & Batasan

**Asumsi:**
- Mitra menyediakan file export produk dan riwayat transaksi dari backoffice Olsera (minimal 3 bulan terakhir) sebagai data awal sinkronisasi dan data latih rekomendasi.
- Outlet memiliki koneksi internet stabil dan minimal satu perangkat (tablet/laptop) untuk dashboard kasir.
- Pelanggan memakai ponsel dengan kamera dan browser modern (Chrome/Safari 2 versi terakhir).
- Jumlah meja belum pasti; sistem mendukung jumlah meja dinamis (dikelola admin).
- Mitra bersedia meluangkan waktu untuk validasi kebutuhan, review mockup, dan UAT.

**Batasan:**
- Belum ada akses API Olsera. Sinkronisasi prototipe berbasis file (CSV) sehingga **tidak realtime**; dilakukan terjadwal/manual oleh admin.
- Belum dipastikan apakah backoffice Olsera mendukung impor transaksi. Jika tidak, CSV transaksi dipakai untuk rekonsiliasi dan kasir tetap mencatat transaksi di Olsera (lihat Lampiran D, R-01).
- Pembayaran QRIS memakai Midtrans sandbox selama pengembangan; aktivasi produksi butuh akun dan verifikasi bisnis milik mitra.
- Waktu pengembangan efektif ±9 minggu (minggu 7–15) dengan tim 7 orang.
- Font Mosvita bergantung lisensi; jika file font tidak tersedia, dipakai fallback (lihat 4.9).

### 1.8 Tech Stack

| Layer | Teknologi | Justifikasi |
|-------|-----------|-------------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + PWA | Satu codebase untuk landing page (SSR/SSG, SEO baik), menu digital pelanggan, dashboard kasir & admin. Tailwind memudahkan penerapan design token brand Matwona |
| State & Data Fetching | TanStack Query + Zustand (keranjang) | Cache data menu, sinkronisasi status server; Zustand ringan untuk state keranjang yang dipersist di `localStorage` |
| Backend API | NestJS 12 (TypeScript, ESM) + Prisma 7 ORM + Vitest | Satu bahasa dengan frontend sehingga anggota tim bisa saling bantu; arsitektur modular cocok untuk SDD; Prisma memberi migrasi & type-safety |
| Realtime | Socket.IO (+ Redis adapter) | Push pesanan baru ke kasir dan update status ke pelanggan tanpa polling |
| AI Service | Python 3.12 + FastAPI + pandas + mlxtend | Ekosistem data mining Python paling matang; FP-Growth dari mlxtend untuk association rules |
| Database | PostgreSQL 16 | Data relasional (menu, pesanan, pembayaran) dan query agregasi analitik |
| Cache/Queue | Redis | Adapter Socket.IO, cache menu publik, rate limiting |
| Pembayaran | Midtrans Snap (QRIS) | Payment gateway yang umum di Indonesia, sandbox gratis untuk pengujian |
| Penyimpanan Gambar | Cloudinary (free tier) | Upload & optimasi foto menu otomatis (resize, WebP) |
| Deployment | Vercel (web), Google Cloud Run (API & AI service), Neon/Cloud SQL (PostgreSQL), Upstash (Redis) | Memenuhi kriteria teknologi cloud; container autoscaling; free tier cukup untuk prototipe & exhibition |
| CI/CD | GitHub Actions | Lint, test, build, dan deploy otomatis dari branch `main` |
| Monitoring | Sentry (error tracking) + log Cloud Run | Bukti kualitas & debugging cepat menjelang exhibition |
| Desain UI/UX | Figma | Wireframe, mockup, prototype interaktif untuk komponen penilaian Prototype UI/UX |

---

## 2. Fitur Utama

### 2.1 Ringkasan Fitur

| No | Fitur | Prioritas | Status | FR Terkait |
|----|-------|-----------|--------|-----------|
| 1 | Scan QR Meja & Menu Digital | 🔴 Must Have | Planned | FR-001, FR-002 |
| 2 | Keranjang & Checkout Tamu | 🔴 Must Have | Planned | FR-003, FR-004 |
| 3 | Pembayaran (QRIS & Bayar di Kasir) | 🔴 Must Have | Planned | FR-005, FR-006 |
| 4 | Status Pesanan Pelanggan | 🔴 Must Have | Planned | FR-007 |
| 5 | Dashboard Kasir Realtime | 🔴 Must Have | Planned | FR-008, FR-024 |
| 6 | Autentikasi Staf & RBAC | 🔴 Must Have | Planned | FR-009, FR-021 |
| 7 | Manajemen Menu | 🔴 Must Have | Planned | FR-010 |
| 8 | Manajemen Meja & QR | 🔴 Must Have | Planned | FR-011 |
| 9 | Landing Page | 🔴 Must Have | Planned | FR-012 |
| 10 | Sinkronisasi Olsera (Adapter) | 🔴 Must Have | Planned | FR-013, FR-014, FR-023 |
| 11 | Rekomendasi Menu Berbasis AI | 🔴 Must Have | Planned | FR-015, FR-016, FR-022 |
| 12 | Dashboard Analitik Penjualan | 🔴 Must Have | Planned | FR-017, FR-018, FR-019 |
| 13 | Manajemen Promo | 🟡 Should Have | Planned | FR-020 |

### 2.2 Detail Fitur

#### 2.2.1 Scan QR Meja & Menu Digital

**Deskripsi:** Setiap meja memiliki QR berisi URL unik `https://<domain>/m/matwona/t/<table_token>`. Saat dibuka, sistem memvalidasi token, menyimpan konteks meja di sesi browser, lalu menampilkan menu per kategori (mis. Olahan Tuna, Olahan Ayam Kampung, Minuman, Tambahan). Menu menampilkan foto, nama, deskripsi singkat, harga, badge promo, dan label "Habis" untuk item yang tidak tersedia. Bagian atas menu menampilkan carousel "Populer sekarang" dari AI service.

**User Stories:**
- Sebagai pelanggan, saya ingin scan QR di meja lalu langsung melihat menu, agar saya tidak perlu antre ke kasir atau menunggu pelayan.
- Sebagai pelanggan, saya ingin melihat foto dan harga setiap menu, agar saya yakin dengan pilihan saya sebelum memesan.
- Sebagai pelanggan, saya ingin tahu menu mana yang sedang habis, agar saya tidak memesan sesuatu yang tidak bisa disajikan.
- Sebagai pelanggan, saya ingin mencari menu berdasarkan nama, agar cepat menemukan yang saya mau.

**Acceptance Criteria:**
- [ ] QR valid membuka halaman menu dengan teks "Meja <nomor>" di header.
- [ ] QR dengan token tidak valid/nonaktif menampilkan halaman "QR tidak dikenali, silakan hubungi kasir" dan tidak bisa memesan.
- [ ] Menu dikelompokkan per kategori sesuai `sort_order`; tab kategori bisa di-scroll horizontal dan sticky.
- [ ] Item dengan `is_available = false` atau `stock = 0` tampil abu-abu dengan label "Habis" dan tombol tambah dinonaktifkan.
- [ ] Pencarian memfilter item secara instan (client-side) berdasarkan nama.
- [ ] Halaman menu memenuhi NFR-001 (LCP ≤ 2,5 detik pada 4G).

**Catatan Teknis:**
- Endpoint `GET /api/public/tables/:token` dan `GET /api/public/outlets/:slug/menu`.
- Data menu di-cache di Redis 60 detik dan di-invalidate saat admin mengubah menu atau selesai sinkron Olsera.
- Foto memakai Cloudinary transformation (`w_480,f_auto,q_auto`) dan `next/image` lazy loading.

---

#### 2.2.2 Keranjang & Checkout Tamu

**Deskripsi:** Pelanggan menambahkan item ke keranjang, mengatur jumlah, dan menulis catatan per item. Saat checkout, pelanggan mengisi nama (wajib, untuk dipanggil saat pesanan siap) dan no. HP (opsional), memilih metode pembayaran, lalu mengirim pesanan. Di halaman keranjang tampil rekomendasi "Sering dibeli bersama" (lihat 2.2.11). Promo aktif diterapkan otomatis.

**User Stories:**
- Sebagai pelanggan, saya ingin menambah catatan seperti "sambal dipisah", agar pesanan sesuai selera saya.
- Sebagai pelanggan, saya ingin memesan tanpa membuat akun, agar prosesnya cepat.
- Sebagai pelanggan, saya ingin melihat rincian total termasuk diskon promo sebelum mengirim pesanan, agar tidak ada kejutan saat membayar.

**Acceptance Criteria:**
- [ ] Keranjang tersimpan di `localStorage` per token meja dan tetap ada setelah halaman di-refresh.
- [ ] Jumlah item minimal 1 dan maksimal 20 per baris; catatan maksimal 120 karakter.
- [ ] Nama wajib diisi (2–50 karakter); no. HP opsional, jika diisi harus format Indonesia (`08xx` atau `+628xx`, 10–14 digit).
- [ ] Ringkasan menampilkan subtotal, diskon promo, dan total akhir.
- [ ] Saat pesanan dikirim, server menghitung ulang harga dari database; jika ada item yang menjadi habis atau harga berubah, server mengembalikan error `ITEM_UNAVAILABLE`/`PRICE_CHANGED` dan keranjang menampilkan item yang bermasalah.
- [ ] Setelah sukses, pelanggan diarahkan ke halaman status pesanan dengan kode pesanan (format `MTW-YYMMDD-XXXX`).

**Catatan Teknis:**
- `POST /api/public/orders` dengan header `Idempotency-Key` (UUID dari klien) agar double-tap tidak membuat pesanan ganda.
- Rate limit sesuai NFR-009.
- Stok item dikurangi dalam transaksi database yang sama dengan pembuatan pesanan (`SELECT ... FOR UPDATE`).

---

#### 2.2.3 Pembayaran (QRIS & Bayar di Kasir)

**Deskripsi:** Dua metode pembayaran:
1. **QRIS (online):** server membuat transaksi Midtrans Snap; pelanggan membayar dengan aplikasi e-wallet/m-banking. Status diperbarui lewat webhook Midtrans. Batas waktu bayar 15 menit; lewat dari itu pesanan kedaluwarsa dan stok dikembalikan.
2. **Bayar di kasir:** pesanan langsung masuk ke kasir dengan status pembayaran `UNPAID`. Pelanggan membayar di kasir (tunai/EDC/QRIS milik outlet), lalu kasir menekan "Tandai Lunas".

**User Stories:**
- Sebagai pelanggan, saya ingin membayar dengan QRIS langsung dari meja, agar tidak perlu ke kasir.
- Sebagai pelanggan, saya ingin tetap bisa membayar di kasir, agar saya bisa memakai uang tunai.
- Sebagai kasir, saya ingin tahu pesanan mana yang sudah lunas online, agar tidak menagih dua kali.
- Sebagai owner, saya ingin status pembayaran tercatat akurat, agar laporan omzet benar.

**Acceptance Criteria:**
- [ ] Memilih QRIS menampilkan Snap popup/redirect dengan QR yang bisa dipindai; nominal sama persis dengan total pesanan.
- [ ] Webhook `settlement`/`capture` mengubah `payment_status` menjadi `PAID` dan memancarkan event `payment.updated` ke kasir & pelanggan.
- [ ] Webhook `expire`/`cancel`/`deny` mengubah status menjadi `EXPIRED`/`FAILED`, mengubah pesanan menjadi `CANCELLED`, dan mengembalikan stok.
- [ ] Webhook dengan signature tidak valid ditolak (HTTP 403) dan dicatat di log.
- [ ] Notifikasi webhook yang sama dua kali tidak menyebabkan perubahan ganda (idempoten).
- [ ] Pesanan "Bayar di kasir" tampil di dashboard kasir dengan badge "Belum Bayar"; tombol "Tandai Lunas" mengubah status menjadi `PAID` dan mencatat `paid_by_user_id`.
- [ ] Pelanggan dengan QRIS gagal/kedaluwarsa bisa memilih ulang metode pembayaran dari halaman status.

**Catatan Teknis:**
- Verifikasi signature: `SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)` dibandingkan dengan `signature_key`.
- Gunakan `order_code` sebagai `order_id` Midtrans; simpan payload webhook mentah di `payments.raw_response` untuk audit.
- Untuk demo tanpa internet publik di laptop, gunakan Midtrans sandbox simulator dan endpoint webhook yang sudah ter-deploy di Cloud Run.

---

#### 2.2.4 Status Pesanan Pelanggan

**Deskripsi:** Halaman `/m/matwona/order/<order_code>` menampilkan progres pesanan secara realtime: Menunggu Pembayaran → Diterima Kasir → Sedang Disiapkan → Disajikan. Juga menampilkan rincian item, total, dan metode pembayaran.

**User Stories:**
- Sebagai pelanggan, saya ingin melihat status pesanan saya, agar saya tahu pesanan sudah diterima dan sedang disiapkan.
- Sebagai pelanggan, saya ingin bisa membuka kembali status pesanan setelah menutup browser, agar tidak kehilangan informasi.

**Acceptance Criteria:**
- [ ] Perubahan status oleh kasir tampil di halaman pelanggan ≤ 2 detik tanpa refresh.
- [ ] Jika koneksi WebSocket putus, halaman otomatis polling setiap 10 detik sampai tersambung kembali.
- [ ] Kode pesanan terakhir tersimpan di `localStorage` sehingga menu menampilkan banner "Lihat pesanan aktif".
- [ ] Halaman status tidak menampilkan data pesanan lain (akses hanya dengan `order_code` + `table_token` yang cocok).

**Catatan Teknis:**
- Klien bergabung ke room Socket.IO `order:<order_code>` setelah verifikasi token.

---

#### 2.2.5 Dashboard Kasir Realtime

**Deskripsi:** Tampilan kanban/daftar untuk kasir dengan kolom: Baru, Diproses, Disajikan, Selesai. Pesanan baru memicu notifikasi suara dan highlight. Kasir dapat mengonfirmasi pesanan, menandai lunas (untuk bayar di kasir), mengubah status, membatalkan dengan alasan, dan mencetak ringkasan pesanan untuk diteruskan ke dapur secara manual.

**User Stories:**
- Sebagai kasir, saya ingin langsung tahu ketika ada pesanan baru, agar pelanggan tidak menunggu lama.
- Sebagai kasir, saya ingin melihat nomor meja, nama pelanggan, item, catatan, dan status bayar dalam satu kartu, agar mudah meneruskan pesanan ke dapur.
- Sebagai kasir, saya ingin membatalkan pesanan dengan alasan, agar ada jejak jika terjadi masalah.

**Acceptance Criteria:**
- [ ] Pesanan baru muncul di kolom "Baru" ≤ 2 detik dengan suara notifikasi (bisa dimatikan).
- [ ] Kartu pesanan menampilkan: kode pesanan, nomor meja, nama pelanggan, daftar item + catatan, total, metode & status bayar, waktu masuk.
- [ ] Transisi status mengikuti aturan state machine (lihat 4.2, tabel `orders`); transisi tidak valid ditolak server (`INVALID_STATUS_TRANSITION`).
- [ ] Pesanan QRIS yang belum lunas tidak bisa dipindah ke "Diproses".
- [ ] Pembatalan wajib mengisi alasan (min. 5 karakter); stok item dikembalikan.
- [ ] Filter pesanan hari ini/rentang tanggal dan pencarian kode pesanan/nomor meja tersedia.
- [ ] Jika WebSocket terputus, muncul banner "Koneksi terputus, mencoba menyambung..." dan data di-refresh otomatis setelah tersambung.

**Catatan Teknis:**
- Kasir bergabung ke room `outlet:<outlet_id>:cashier` setelah autentikasi JWT pada handshake Socket.IO.
- Cetak ringkasan (Could Have) memakai halaman print CSS ukuran 58/80 mm.

---

#### 2.2.6 Autentikasi Staf & RBAC

**Deskripsi:** Login berbasis email & password untuk role `CASHIER` dan `ADMIN`. Admin membuat dan menonaktifkan akun kasir.

**User Stories:**
- Sebagai owner, saya ingin hanya staf berwenang yang bisa membuka dashboard, agar data penjualan aman.
- Sebagai owner, saya ingin menonaktifkan akun kasir yang sudah tidak bekerja, agar ia tidak bisa mengakses sistem.

**Acceptance Criteria:**
- [ ] Login gagal 5 kali berturut-turut mengunci akun selama 15 menit.
- [ ] Kasir yang membuka URL admin mendapat halaman 403.
- [ ] Akun nonaktif tidak bisa login dan refresh token-nya dicabut.
- [ ] Logout menghapus cookie token dan mencabut refresh token di server.

**Catatan Teknis:** lihat 4.4.

---

#### 2.2.7 Manajemen Menu

**Deskripsi:** Admin mengelola kategori dan item menu: nama, deskripsi, harga, foto, stok, SKU, `olsera_product_id`, urutan tampil, dan status tersedia. Perubahan langsung terlihat di menu digital dan landing page.

**User Stories:**
- Sebagai owner, saya ingin menandai menu "Habis" dengan satu klik, agar pelanggan tidak memesannya.
- Sebagai owner, saya ingin mengunggah foto menu, agar menu digital menarik.
- Sebagai owner, saya ingin mengatur urutan kategori dan menu, agar menu andalan tampil paling atas.

**Acceptance Criteria:**
- [ ] CRUD kategori & item dengan validasi: nama wajib, harga bilangan bulat ≥ 0 (Rupiah), foto JPG/PNG/WebP maks. 2 MB.
- [ ] Toggle tersedia/habis tersimpan dan tampil di menu pelanggan ≤ 60 detik (TTL cache) atau segera jika cache di-invalidate.
- [ ] Item yang pernah dipesan tidak dihapus permanen, melainkan diarsipkan (`is_archived = true`) agar histori & analitik tetap utuh.
- [ ] Field yang bersumber dari Olsera (nama, harga, stok) diberi ikon "tersinkron Olsera" dan perubahan manual memunculkan peringatan bahwa nilai bisa tertimpa saat sinkron berikutnya.

---

#### 2.2.8 Manajemen Meja & QR

**Deskripsi:** Karena jumlah meja belum pasti, admin bisa menambah/mengubah/menonaktifkan meja kapan saja. Setiap meja mendapat token QR unik. Admin mengunduh PDF berisi QR siap cetak (satu QR per halaman A6 atau grid A4) dengan desain brand Matwona.

**User Stories:**
- Sebagai owner, saya ingin menambah meja baru dan langsung mencetak QR-nya, agar meja baru bisa dipakai hari itu juga.
- Sebagai owner, saya ingin mengganti QR meja yang rusak atau disalahgunakan, agar QR lama tidak berlaku lagi.

**Acceptance Criteria:**
- [ ] Nomor/label meja unik per outlet.
- [ ] Regenerate token membuat QR lama langsung tidak valid.
- [ ] PDF QR memuat logo Matwona, nomor meja, instruksi singkat "Scan untuk pesan", dan warna brand.
- [ ] Meja nonaktif tidak bisa dipakai memesan.

**Catatan Teknis:** QR digenerate di server (`qrcode` npm) dan PDF dengan `pdfkit`.

---

#### 2.2.9 Landing Page

**Deskripsi:** Halaman publik di root domain: hero dengan logo & tagline ("Two worlds. One table. Simply, makan."), cerita brand (Ma-Two-Na: tuna & ayam kampung), daftar menu read-only per kategori, promo aktif, lokasi (embed Google Maps + alamat + jam buka), dan tautan media sosial/WhatsApp.

**User Stories:**
- Sebagai calon pelanggan, saya ingin melihat menu dan harga sebelum datang, agar bisa merencanakan kunjungan.
- Sebagai calon pelanggan, saya ingin tahu lokasi dan jam buka, agar tidak salah datang.
- Sebagai owner, saya ingin promo tampil di website, agar menarik pelanggan baru.

**Acceptance Criteria:**
- [ ] Halaman di-render SSG/ISR (revalidate 5 menit) dengan meta title, description, Open Graph image, dan structured data `Restaurant` (schema.org).
- [ ] Skor Lighthouse SEO ≥ 90 dan Accessibility ≥ 90.
- [ ] Menu landing memakai data yang sama dengan menu digital (tidak ada input ganda).
- [ ] Hanya promo dengan periode aktif yang tampil.
- [ ] Landing page tidak memiliki tombol pesan online (pemesanan hanya via QR di meja); tersedia CTA "Lihat Lokasi" dan "Hubungi via WhatsApp".
- [ ] Desain mengikuti brand guideline (lihat 4.9).

---

#### 2.2.10 Sinkronisasi Olsera (Adapter)

**Deskripsi:** Modul `pos-sync` dirancang dengan pola **Adapter**: interface `PosSyncAdapter` dengan beberapa implementasi. Karena API Olsera belum tersedia, prototipe memakai `OlseraCsvAdapter`:

| Data | Arah | Mekanisme Prototipe (CSV) | Mekanisme Target (API) |
|------|------|---------------------------|------------------------|
| Menu/produk & kategori | Olsera → Smart Order | Admin unggah file export produk Olsera; sistem upsert berdasarkan `olsera_product_id`/SKU | Tarik terjadwal via API |
| Harga | Olsera → Smart Order | Ikut file produk | Ikut API produk |
| Stok | Olsera → Smart Order | Ikut file produk (snapshot saat impor) | Tarik berkala / webhook stok |
| Transaksi pesanan digital | Smart Order → Olsera | Admin unduh CSV transaksi per rentang tanggal untuk diimpor/rekonsiliasi di Olsera | Push transaksi via API saat pesanan lunas |

**Aturan source of truth:** Olsera adalah sumber kebenaran untuk master data (nama, harga, stok); Smart Order adalah sumber kebenaran untuk pesanan digital. Impor menimpa field master; item yang tidak ada di file tidak dihapus, melainkan ditandai untuk ditinjau.

**User Stories:**
- Sebagai owner, saya ingin menu dan harga di menu digital sama dengan di Olsera, agar tidak ada selisih harga.
- Sebagai owner, saya ingin transaksi dari menu digital bisa masuk ke pencatatan Olsera, agar laporan penjualan saya tetap di satu tempat.
- Sebagai owner, saya ingin melihat riwayat sinkronisasi dan baris yang gagal, agar bisa memperbaikinya.

**Acceptance Criteria:**
- [ ] Unggah CSV menampilkan **pratinjau**: jumlah item baru, berubah, tidak berubah, dan baris error (dengan nomor baris & alasan) sebelum admin menekan "Terapkan".
- [ ] Pemetaan kolom CSV bisa dikonfigurasi (mis. kolom "Nama Produk" → `name`) dan disimpan untuk impor berikutnya.
- [ ] Impor 500 baris selesai ≤ 10 detik.
- [ ] Ekspor transaksi menghasilkan CSV berisi: kode pesanan, tanggal, meja, item, SKU, qty, harga, diskon, total, metode bayar, status bayar; hanya pesanan `PAID`.
- [ ] Setiap proses tercatat di `pos_sync_logs` (arah, tipe, status, jumlah sukses/gagal, detail error, user).
- [ ] Mengganti adapter (CSV → API) hanya membutuhkan perubahan konfigurasi `POS_SYNC_ADAPTER` tanpa mengubah modul lain.
- [ ] Tersedia `MockOlseraAdapter` dengan data dummy untuk pengujian otomatis.

**Catatan Teknis:**

```ts
// apps/api/src/modules/pos-sync/adapters/pos-sync.adapter.ts
export interface PosSyncAdapter {
  readonly name: 'olsera-csv' | 'olsera-api' | 'mock';
  pullProducts(input: PullProductsInput): Promise<ExternalProduct[]>;
  pushTransactions(orders: PaidOrder[]): Promise<PushResult>;
  pullStock?(productIds: string[]): Promise<ExternalStock[]>;
}
```

- Format kolom CSV final disesuaikan setelah tim menerima **contoh file export asli** dari backoffice Olsera milik mitra.
- File export riwayat transaksi Olsera juga dipakai sebagai **data latih awal** rekomendasi (lihat 2.2.11).

---

#### 2.2.11 Rekomendasi Menu Berbasis AI

**Deskripsi:** AI service (FastAPI) menghasilkan dua jenis rekomendasi:

1. **"Sering dibeli bersama" (association rules):** algoritma FP-Growth pada data keranjang (gabungan riwayat transaksi Olsera + pesanan digital). Rule dengan `support ≥ 0,01`, `confidence ≥ 0,2`, dan `lift > 1` disimpan. Saat pelanggan membuka keranjang, sistem mengambil rule yang antecedent-nya cocok dengan isi keranjang, mengurutkan berdasarkan `lift × confidence`, dan menampilkan maks. 3 item yang belum ada di keranjang dan sedang tersedia.
2. **"Populer sekarang" (time-aware popularity):** item terlaris per slot waktu (pagi 06–10, siang 10–15, sore 15–18, malam 18–22) dalam 30 hari terakhir. Dipakai di halaman menu dan sebagai **fallback cold start** jika tidak ada rule yang cocok.

Model dilatih ulang setiap hari pukul 03:00 WIB dan bisa dipicu manual oleh admin.

**User Stories:**
- Sebagai pelanggan, saya ingin melihat saran menu pendamping (mis. minuman atau tambahan yang cocok dengan olahan tuna pilihan saya), agar pesanan saya lebih lengkap.
- Sebagai pelanggan, saya ingin tahu menu apa yang paling sering dipesan pada jam ini, agar saya mudah memilih.
- Sebagai owner, saya ingin rekomendasi meningkatkan nilai transaksi, agar omzet bertambah.
- Sebagai owner, saya ingin tahu seberapa efektif rekomendasi, agar bisa menilai manfaat fitur ini.

**Acceptance Criteria:**
- [ ] Rekomendasi keranjang tidak pernah menampilkan item yang sudah ada di keranjang atau sedang habis.
- [ ] Jika tidak ada rule yang cocok atau AI service tidak merespons ≤ 300 ms, ditampilkan "Populer sekarang" (NFR-020).
- [ ] Setiap impression, klik, dan add-to-cart dari rekomendasi tercatat di `recommendation_events`.
- [ ] Training menghasilkan laporan: jumlah transaksi, jumlah rule, metrik evaluasi offline (lihat di bawah), dan durasi.
- [ ] Evaluasi offline (holdout 20% transaksi terbaru) menghasilkan **HitRate@3 lebih tinggi daripada baseline "menu terlaris"**; hasilnya didokumentasikan di laporan teknis.
- [ ] Admin dapat melihat 20 rule teratas (antecedent → consequent, support, confidence, lift) di dashboard.

**Catatan Teknis:**
- Data latih: tabel `order_items` dikelompokkan per `order_id` → one-hot encoding → `mlxtend.frequent_patterns.fpgrowth` → `association_rules`.
- Hasil disimpan ke `recommendation_rules` (versioned per `model_version`); rekomendasi realtime hanya membaca tabel (tanpa training on-the-fly).
- Metrik evaluasi: HitRate@3, Precision@3, coverage katalog. Metrik online: CTR rekomendasi, attach rate (persentase pesanan yang berisi minimal 1 item dari rekomendasi), selisih AOV pesanan dengan vs tanpa item rekomendasi.
- Threshold support/confidence disimpan di env agar bisa di-tuning tanpa deploy ulang kode.

---

#### 2.2.12 Dashboard Analitik Penjualan

**Deskripsi:** Halaman analitik untuk owner dengan filter rentang tanggal dan sumber (semua / pesanan digital / transaksi impor Olsera):

| Widget | Isi |
|--------|-----|
| Kartu KPI | Omzet, jumlah pesanan, AOV, persentase pembayaran QRIS vs kasir; dibandingkan dengan periode sebelumnya |
| Tren penjualan | Grafik garis omzet & jumlah pesanan per hari/minggu/bulan |
| Menu terlaris | Top 10 item berdasarkan qty dan omzet |
| Heatmap jam ramai | Jumlah pesanan per hari dalam seminggu × jam |
| Menu engineering | Scatter popularitas vs kontribusi omzet per item, dikelompokkan Star / Plowhorse / Puzzle / Dog |
| Performa rekomendasi | Impression, CTR, attach rate, tren mingguan |
| Ekspor | Unduh data tabel sebagai CSV |

**User Stories:**
- Sebagai owner, saya ingin melihat omzet dan menu terlaris per periode, agar bisa merencanakan stok tuna dan ayam kampung.
- Sebagai owner, saya ingin tahu jam paling ramai, agar bisa mengatur jadwal staf.
- Sebagai owner, saya ingin tahu menu mana yang laku tapi kurang menguntungkan dan sebaliknya, agar bisa mengatur harga atau promo.

**Acceptance Criteria:**
- [ ] Semua widget menghormati filter rentang tanggal; default 30 hari terakhir.
- [ ] Angka omzet hanya menghitung pesanan `PAID` dan tidak `CANCELLED`.
- [ ] Nilai di dashboard cocok dengan hasil query manual pada data uji (selisih 0).
- [ ] Klasifikasi menu engineering memakai garis batas rata-rata popularitas (qty) dan rata-rata omzet per item pada periode terpilih.
- [ ] Dashboard termuat ≤ 3 detik untuk data 6 bulan.
- [ ] Grafik dapat dibaca di tablet (lebar ≥ 768 px) dan memakai palet warna brand.

**Catatan Teknis:**
- Agregasi via SQL (`date_trunc`, `GROUP BY`) dengan index pada `orders(outlet_id, created_at)`; materialized view harian `mv_daily_sales` di-refresh setiap jam untuk rentang panjang.
- Charting memakai Recharts.

---

#### 2.2.13 Manajemen Promo

**Deskripsi:** Admin membuat promo sederhana: diskon persentase atau nominal, berlaku untuk item tertentu atau minimal belanja, dengan periode aktif. Promo aktif tampil di landing page dan sebagai badge di menu digital, dan diterapkan otomatis saat checkout.

**User Stories:**
- Sebagai owner, saya ingin membuat promo "Diskon 10% Paket Tuna setiap Jumat", agar menarik pelanggan di hari sepi.
- Sebagai pelanggan, saya ingin diskon langsung terpotong tanpa memasukkan kode, agar praktis.

**Acceptance Criteria:**
- [ ] Promo memiliki judul, deskripsi, gambar banner opsional, tipe (`PERCENT`/`NOMINAL`), nilai, minimal belanja, item terkait (opsional), tanggal mulai-selesai, dan hari aktif.
- [ ] Maksimal satu promo diterapkan per item (dipilih diskon terbesar); diskon tidak membuat harga negatif.
- [ ] Promo kedaluwarsa otomatis tidak tampil dan tidak berlaku.
- [ ] Nilai diskon tersimpan per baris di `order_items.discount_amount` untuk analitik dan ekspor Olsera.

---

## 3. Diagram Visual

### 3.1 System Architecture

```mermaid
graph TB
    subgraph Client["Klien"]
        CUST["Ponsel Pelanggan<br/>(scan QR)"]
        VISIT["Pengunjung Landing Page"]
        CASH["Tablet/Laptop Kasir"]
        ADM["Laptop Owner/Admin"]
    end

    subgraph Vercel["Vercel"]
        WEB["Next.js Web App<br/>Landing · Menu Digital · Dashboard Kasir & Admin"]
    end

    subgraph GCP["Google Cloud Run"]
        API["NestJS API<br/>REST + Socket.IO Gateway"]
        RECO["FastAPI AI Service<br/>FP-Growth · Popularity"]
        JOB["Cloud Scheduler<br/>retrain 03:00 WIB"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL")]
        RD[("Redis<br/>cache · pub/sub · rate limit")]
    end

    subgraph External["Layanan Eksternal"]
        MID["Midtrans<br/>QRIS Snap"]
        CLD["Cloudinary<br/>foto menu"]
        OLS["Olsera POS<br/>(CSV sekarang / API nanti)"]
        MAPS["Google Maps Embed"]
    end

    CUST --> WEB
    VISIT --> WEB
    CASH --> WEB
    ADM --> WEB
    WEB -->|REST / WebSocket| API
    API --> PG
    API --> RD
    API -->|HTTP internal| RECO
    RECO --> PG
    JOB -->|POST /internal/train| RECO
    API -->|create transaction| MID
    MID -->|webhook notification| API
    API --> CLD
    API <-->|PosSyncAdapter| OLS
    WEB --> MAPS
```

### 3.2 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    OUTLETS ||--o{ USERS : has
    OUTLETS ||--o{ DINING_TABLES : has
    OUTLETS ||--o{ CATEGORIES : has
    OUTLETS ||--o{ ORDERS : receives
    OUTLETS ||--o{ PROMOS : runs
    OUTLETS ||--o{ POS_SYNC_LOGS : records
    CATEGORIES ||--o{ MENU_ITEMS : groups
    DINING_TABLES ||--o{ ORDERS : "placed at"
    ORDERS ||--|{ ORDER_ITEMS : contains
    MENU_ITEMS ||--o{ ORDER_ITEMS : "ordered as"
    ORDERS ||--o{ PAYMENTS : "paid by"
    PROMOS ||--o{ PROMO_ITEMS : targets
    MENU_ITEMS ||--o{ PROMO_ITEMS : "included in"
    PROMOS ||--o{ ORDER_ITEMS : "applied to"
    USERS ||--o{ ORDERS : handles
    USERS ||--o{ REFRESH_TOKENS : owns
    MENU_ITEMS ||--o{ RECOMMENDATION_EVENTS : "shown as"
    ORDERS ||--o{ RECOMMENDATION_EVENTS : "converted in"

    OUTLETS {
        uuid id PK
        string slug UK
        string name
        string address
        string phone
        json opening_hours
        decimal latitude
        decimal longitude
    }
    USERS {
        uuid id PK
        uuid outlet_id FK
        string name
        string email UK
        string password_hash
        enum role
        boolean is_active
    }
    DINING_TABLES {
        uuid id PK
        uuid outlet_id FK
        string label
        string qr_token UK
        boolean is_active
    }
    CATEGORIES {
        uuid id PK
        uuid outlet_id FK
        string name
        int sort_order
    }
    MENU_ITEMS {
        uuid id PK
        uuid category_id FK
        string name
        int price
        int stock
        string sku
        string olsera_product_id
        boolean is_available
        boolean is_archived
    }
    ORDERS {
        uuid id PK
        string order_code UK
        uuid outlet_id FK
        uuid table_id FK
        string customer_name
        enum status
        enum payment_method
        enum payment_status
        int total_amount
        datetime created_at
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        uuid promo_id FK
        int quantity
        int unit_price
        int discount_amount
        string note
        boolean from_recommendation
    }
    PAYMENTS {
        uuid id PK
        uuid order_id FK
        string provider
        string provider_ref
        enum status
        int amount
        json raw_response
    }
    PROMOS {
        uuid id PK
        uuid outlet_id FK
        string title
        enum discount_type
        int discount_value
        date starts_on
        date ends_on
    }
    PROMO_ITEMS {
        uuid promo_id FK
        uuid menu_item_id FK
    }
    POS_SYNC_LOGS {
        uuid id PK
        uuid outlet_id FK
        enum direction
        enum entity
        enum status
        int success_count
        int failed_count
    }
    RECOMMENDATION_RULES {
        uuid id PK
        string model_version
        json antecedent_item_ids
        uuid consequent_item_id
        float support
        float confidence
        float lift
    }
    RECOMMENDATION_EVENTS {
        uuid id PK
        uuid menu_item_id FK
        uuid order_id FK
        string session_id
        enum event_type
        enum source
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash
        datetime expires_at
    }
```

### 3.3 User Flow Diagram

#### 3.3.1 Alur Pelanggan (Pesan & Bayar)

```mermaid
flowchart TD
    A["Pelanggan duduk & scan QR meja"] --> B{"Token meja valid?"}
    B -->|Tidak| B1["Halaman: QR tidak dikenali,<br/>hubungi kasir"]
    B -->|Ya| C["Menu digital + Populer sekarang"]
    C --> D["Tambah item & catatan ke keranjang"]
    D --> E["Keranjang + Sering dibeli bersama"]
    E -->|Tambah rekomendasi| D
    E --> F["Checkout: isi nama, no. HP opsional"]
    F --> G{"Pilih metode bayar"}
    G -->|QRIS| H["Midtrans Snap: scan & bayar"]
    H --> I{"Pembayaran berhasil<br/>≤ 15 menit?"}
    I -->|Ya| J["Status: Lunas, menunggu kasir"]
    I -->|Tidak / kedaluwarsa| K["Pesanan dibatalkan,<br/>pilih ulang metode"]
    K --> G
    G -->|Bayar di kasir| L["Status: Belum bayar,<br/>bayar di kasir"]
    L --> M["Kasir terima pembayaran<br/>& tandai lunas"]
    M --> J
    J --> N["Kasir konfirmasi & teruskan<br/>ke dapur manual"]
    N --> O["Status: Sedang disiapkan"]
    O --> P["Status: Disajikan"]
    P --> Q["Selesai"]
```

#### 3.3.2 Alur Kasir

```mermaid
flowchart TD
    A["Login kasir"] --> B["Dashboard pesanan realtime"]
    B --> C["Notifikasi pesanan baru"]
    C --> D{"Metode bayar?"}
    D -->|QRIS, sudah lunas| E["Konfirmasi pesanan"]
    D -->|Bayar di kasir| F["Terima pembayaran pelanggan"]
    F --> G["Tandai Lunas"]
    G --> E
    E --> H["Cetak/catat ringkasan<br/>dan teruskan ke dapur manual"]
    H --> I["Ubah status: Diproses"]
    I --> J["Ubah status: Disajikan"]
    J --> K["Ubah status: Selesai"]
    C --> L{"Ada masalah?"}
    L -->|Ya| M["Batalkan + isi alasan<br/>stok dikembalikan"]
```

#### 3.3.3 Alur Admin: Sinkronisasi Olsera (CSV)

```mermaid
flowchart TD
    A["Owner export produk<br/>dari backoffice Olsera"] --> B["Unggah CSV di menu Sinkronisasi"]
    B --> C["Sistem cocokkan kolom<br/>dengan pemetaan tersimpan"]
    C --> D["Pratinjau: baru / berubah /<br/>tidak berubah / error"]
    D --> E{"Terapkan?"}
    E -->|Batal| B
    E -->|Ya| F["Upsert menu, harga, stok"]
    F --> G["Invalidate cache menu"]
    G --> H["Catat pos_sync_logs"]
    H --> I["Menu digital & landing ter-update"]
    J["Owner pilih rentang tanggal"] --> K["Unduh CSV transaksi lunas"]
    K --> L["Impor / rekonsiliasi di Olsera"]
    K --> H
```

### 3.4 API Flow Diagram

#### 3.4.1 Pembuatan Pesanan & Pembayaran QRIS

```mermaid
sequenceDiagram
    participant P as Pelanggan (Web)
    participant A as NestJS API
    participant DB as PostgreSQL
    participant R as AI Service
    participant M as Midtrans
    participant K as Kasir (Web)

    P->>A: GET /api/public/tables/:token
    A->>DB: Validasi token meja
    DB-->>A: Data meja
    A-->>P: 200 meja + outlet
    P->>A: GET /api/public/recommendations?cart=...
    A->>R: GET /internal/recommend
    R->>DB: Baca recommendation_rules
    R-->>A: Item rekomendasi
    A-->>P: 200 daftar rekomendasi
    P->>A: POST /api/public/orders (Idempotency-Key)
    A->>DB: BEGIN, lock stok, hitung ulang harga & promo
    A->>DB: INSERT orders, order_items, COMMIT
    A-->>K: socket order.created
    A-->>P: 201 order_code
    P->>A: POST /api/public/orders/:code/pay
    A->>M: Create Snap transaction (QRIS)
    M-->>A: snap_token + redirect_url
    A-->>P: 200 snap_token
    P->>M: Bayar via QRIS
    M->>A: POST /api/payments/midtrans/notification
    A->>A: Verifikasi signature & idempotensi
    A->>DB: UPDATE payments, orders.payment_status = PAID
    A-->>K: socket payment.updated
    A-->>P: socket payment.updated
```

#### 3.4.2 Training & Penyajian Rekomendasi

```mermaid
sequenceDiagram
    participant S as Cloud Scheduler
    participant R as AI Service
    participant DB as PostgreSQL
    participant AD as Admin (Web)
    participant A as NestJS API

    S->>R: POST /internal/train (03:00 WIB)
    AD->>A: POST /api/recommendations/train (manual)
    A->>R: POST /internal/train
    R->>DB: Ambil order_items 180 hari terakhir
    R->>R: One-hot encoding, FP-Growth, association_rules
    R->>R: Evaluasi holdout: HitRate@3 vs baseline
    R->>DB: INSERT recommendation_rules (model_version baru)
    R->>DB: Hitung popularitas per slot waktu
    R-->>A: Laporan training
    A-->>AD: 200 ringkasan model
```

---

## 4. Arahan Teknis (Technical Guidelines)

### 4.1 Struktur Folder Proyek

Monorepo dengan pnpm workspaces:

```
matwona-smart-order/
├── apps/
│   ├── web/                          # Next.js 16 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (landing)/        # Landing page publik (/)
│   │   │   │   ├── m/[outlet]/
│   │   │   │   │   ├── t/[token]/    # Menu digital & keranjang
│   │   │   │   │   └── order/[code]/ # Status pesanan
│   │   │   │   ├── cashier/          # Dashboard kasir
│   │   │   │   ├── admin/            # Dashboard admin/owner
│   │   │   │   │   ├── menu/
│   │   │   │   │   ├── tables/
│   │   │   │   │   ├── promos/
│   │   │   │   │   ├── staff/
│   │   │   │   │   ├── sync/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   └── recommendations/
│   │   │   │   └── login/
│   │   │   ├── components/           # UI reusable (ui/, menu/, cashier/, charts/)
│   │   │   ├── hooks/                # useCart, useSocket, useOrderStatus
│   │   │   ├── lib/                  # api client, socket client, formatters
│   │   │   ├── stores/               # Zustand (cart)
│   │   │   └── app/globals.css       # token brand (Tailwind v4 @theme)
│   │   ├── public/                   # logo SVG Matwona, ikon PWA, manifest
│   ├── api/                          # NestJS 12
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── outlets/
│   │   │   │   ├── tables/
│   │   │   │   ├── menu/             # categories + menu-items
│   │   │   │   ├── orders/
│   │   │   │   ├── payments/         # midtrans client + webhook
│   │   │   │   ├── promos/
│   │   │   │   ├── analytics/
│   │   │   │   ├── recommendations/  # proxy ke AI service + events
│   │   │   │   ├── pos-sync/
│   │   │   │   │   └── adapters/     # pos-sync.adapter.ts, olsera-csv, olsera-api, mock
│   │   │   │   └── realtime/         # Socket.IO gateway
│   │   │   ├── common/               # guards, interceptors, filters, decorators
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts               # outlet Matwona, admin, kategori & menu contoh
│   │   └── test/                     # e2e (supertest)
│   └── reco/                         # FastAPI AI service
│       ├── app/
│       │   ├── main.py
│       │   ├── routers/              # recommend.py, train.py, health.py
│       │   ├── services/             # miner.py (FP-Growth), popularity.py, evaluate.py
│       │   ├── db.py
│       │   └── config.py
│       ├── notebooks/                # EDA data transaksi Olsera (untuk laporan)
│       ├── tests/
│       └── pyproject.toml
├── packages/
│   └── shared/                       # tipe TS & skema Zod bersama (order, menu, error codes)
├── infra/
│   ├── docker-compose.yml            # postgres, redis, api, reco untuk lokal
│   ├── Dockerfile.api
│   └── Dockerfile.reco
├── docs/
│   ├── PRD.md                        # dokumen ini
│   ├── BRS.md · SRS.md · SDD.md · UAT.md
│   ├── user-guide/
│   └── adr/                          # Architecture Decision Records
├── .github/workflows/                # ci.yml, deploy.yml
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

### 4.2 Desain Database

Konvensi: nama tabel `snake_case` jamak, primary key UUID v7, nominal uang `INTEGER` dalam Rupiah (tanpa desimal), waktu `TIMESTAMPTZ` disimpan UTC dan ditampilkan WIB.

#### Tabel: outlets

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| slug | VARCHAR(50) | UNIQUE, NOT NULL | Dipakai di URL, mis. `matwona` |
| name | VARCHAR(100) | NOT NULL | Nama outlet |
| tagline | VARCHAR(150) | NULL | Tagline landing page |
| description | TEXT | NULL | Cerita brand |
| address | TEXT | NOT NULL | Alamat lengkap |
| phone_whatsapp | VARCHAR(20) | NULL | Untuk CTA WhatsApp |
| latitude | DECIMAL(9,6) | NULL | Koordinat peta |
| longitude | DECIMAL(9,6) | NULL | Koordinat peta |
| opening_hours | JSONB | NOT NULL | `{ "mon": ["10:00","21:00"], ... }` |
| social_links | JSONB | NULL | Instagram, TikTok, dll. |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: users

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet tempat bekerja |
| name | VARCHAR(100) | NOT NULL | Nama staf |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Email login |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| role | ENUM(`ADMIN`,`CASHIER`) | NOT NULL | Role |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Status akun |
| failed_login_count | SMALLINT | NOT NULL, DEFAULT 0 | Untuk lockout |
| locked_until | TIMESTAMPTZ | NULL | Akhir masa kunci |
| last_login_at | TIMESTAMPTZ | NULL | Login terakhir |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: refresh_tokens

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Pemilik token |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256 dari refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL | Kedaluwarsa |
| revoked_at | TIMESTAMPTZ | NULL | Dicabut saat logout/nonaktif |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |

#### Tabel: dining_tables

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| label | VARCHAR(20) | NOT NULL, UNIQUE(outlet_id, label) | Nomor/label meja, mis. `A3` |
| capacity | SMALLINT | NULL | Jumlah kursi |
| qr_token | VARCHAR(32) | UNIQUE, NOT NULL | Token acak 128-bit base62 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Meja aktif |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: categories

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| name | VARCHAR(60) | NOT NULL | Nama kategori |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Urutan tampil |
| olsera_category_id | VARCHAR(64) | NULL | ID kategori di Olsera |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Tampil/tidak |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: menu_items

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| category_id | UUID | FK → categories.id, NOT NULL | Kategori |
| name | VARCHAR(100) | NOT NULL | Nama menu |
| description | VARCHAR(300) | NULL | Deskripsi singkat |
| price | INTEGER | NOT NULL, CHECK (price >= 0) | Harga Rupiah |
| image_url | TEXT | NULL | URL Cloudinary |
| stock | INTEGER | NULL, CHECK (stock >= 0) | NULL = tidak dilacak |
| sku | VARCHAR(64) | NULL, UNIQUE(outlet_id, sku) | SKU dari Olsera |
| olsera_product_id | VARCHAR(64) | NULL, UNIQUE(outlet_id, olsera_product_id) | ID produk Olsera |
| is_available | BOOLEAN | NOT NULL, DEFAULT TRUE | Toggle tersedia/habis |
| is_archived | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Urutan tampil |
| last_synced_at | TIMESTAMPTZ | NULL | Terakhir disinkron dari Olsera |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: orders

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| order_code | VARCHAR(20) | UNIQUE, NOT NULL | `MTW-YYMMDD-XXXX` |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| table_id | UUID | FK → dining_tables.id, NOT NULL | Meja |
| customer_name | VARCHAR(50) | NOT NULL | Nama pelanggan |
| customer_phone | VARCHAR(16) | NULL | No. HP opsional |
| status | ENUM(`NEW`,`CONFIRMED`,`PREPARING`,`SERVED`,`COMPLETED`,`CANCELLED`) | NOT NULL, DEFAULT `NEW` | Status pesanan |
| payment_method | ENUM(`QRIS`,`CASHIER`) | NOT NULL | Metode bayar |
| payment_status | ENUM(`UNPAID`,`PENDING`,`PAID`,`FAILED`,`EXPIRED`) | NOT NULL | Status bayar |
| subtotal_amount | INTEGER | NOT NULL | Sebelum diskon |
| discount_amount | INTEGER | NOT NULL, DEFAULT 0 | Total diskon |
| total_amount | INTEGER | NOT NULL | Yang harus dibayar |
| idempotency_key | UUID | UNIQUE, NOT NULL | Cegah pesanan ganda |
| handled_by_user_id | UUID | FK → users.id, NULL | Kasir yang memproses |
| paid_by_user_id | UUID | FK → users.id, NULL | Kasir yang menandai lunas (bayar di kasir) |
| cancel_reason | VARCHAR(200) | NULL | Alasan batal |
| source | ENUM(`DIGITAL`,`OLSERA_IMPORT`) | NOT NULL, DEFAULT `DIGITAL` | Asal data (impor riwayat Olsera untuk analitik & AI) |
| paid_at | TIMESTAMPTZ | NULL | Waktu lunas |
| exported_to_pos_at | TIMESTAMPTZ | NULL | Waktu diekspor ke Olsera |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

Index: `(outlet_id, created_at)`, `(outlet_id, status)`, `(table_id, created_at)`.

**State machine `orders.status`:**

| Dari | Ke (diizinkan) | Syarat |
|------|----------------|--------|
| NEW | CONFIRMED, CANCELLED | QRIS: harus `PAID` untuk ke CONFIRMED |
| CONFIRMED | PREPARING, CANCELLED | – |
| PREPARING | SERVED | – |
| SERVED | COMPLETED | `payment_status = PAID` |
| COMPLETED | – | Status akhir |
| CANCELLED | – | Status akhir; stok dikembalikan |

#### Tabel: order_items

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| order_id | UUID | FK → orders.id, NOT NULL, ON DELETE CASCADE | Pesanan |
| menu_item_id | UUID | FK → menu_items.id, NOT NULL | Menu |
| promo_id | UUID | FK → promos.id, NULL | Promo yang diterapkan |
| item_name_snapshot | VARCHAR(100) | NOT NULL | Nama saat dipesan |
| quantity | SMALLINT | NOT NULL, CHECK (quantity BETWEEN 1 AND 20) | Jumlah |
| unit_price | INTEGER | NOT NULL | Harga satuan saat dipesan |
| discount_amount | INTEGER | NOT NULL, DEFAULT 0 | Diskon baris |
| line_total | INTEGER | NOT NULL | `quantity × unit_price − discount_amount` |
| note | VARCHAR(120) | NULL | Catatan pelanggan |
| from_recommendation | BOOLEAN | NOT NULL, DEFAULT FALSE | Ditambahkan dari rekomendasi |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |

#### Tabel: payments

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| order_id | UUID | FK → orders.id, NOT NULL | Pesanan |
| provider | ENUM(`MIDTRANS`,`CASHIER`) | NOT NULL | Penyedia |
| provider_ref | VARCHAR(100) | NULL, UNIQUE | `transaction_id` Midtrans |
| snap_token | VARCHAR(100) | NULL | Token Snap |
| status | ENUM(`PENDING`,`PAID`,`FAILED`,`EXPIRED`) | NOT NULL | Status |
| amount | INTEGER | NOT NULL | Nominal |
| expires_at | TIMESTAMPTZ | NULL | Batas bayar QRIS |
| raw_response | JSONB | NULL | Payload webhook terakhir |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: promos

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| title | VARCHAR(80) | NOT NULL | Judul promo |
| description | VARCHAR(300) | NULL | Deskripsi |
| banner_url | TEXT | NULL | Gambar banner |
| discount_type | ENUM(`PERCENT`,`NOMINAL`) | NOT NULL | Tipe diskon |
| discount_value | INTEGER | NOT NULL, CHECK (discount_value > 0) | Persen (1–100) atau Rupiah |
| min_purchase | INTEGER | NOT NULL, DEFAULT 0 | Minimal belanja |
| active_days | SMALLINT[] | NULL | 1=Senin … 7=Minggu; NULL = setiap hari |
| starts_on | DATE | NOT NULL | Tanggal mulai |
| ends_on | DATE | NOT NULL, CHECK (ends_on >= starts_on) | Tanggal selesai |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Toggle manual |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: promo_items

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| promo_id | UUID | PK, FK → promos.id, ON DELETE CASCADE | Promo |
| menu_item_id | UUID | PK, FK → menu_items.id | Item terkait (jika kosong → berlaku untuk semua item) |

#### Tabel: pos_sync_logs

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| adapter | VARCHAR(20) | NOT NULL | `olsera-csv` / `olsera-api` / `mock` |
| direction | ENUM(`PULL`,`PUSH`) | NOT NULL | Arah sinkron |
| entity | ENUM(`PRODUCT`,`STOCK`,`TRANSACTION`,`HISTORY_IMPORT`) | NOT NULL | Jenis data |
| status | ENUM(`PREVIEW`,`SUCCESS`,`PARTIAL`,`FAILED`) | NOT NULL | Hasil |
| success_count | INTEGER | NOT NULL, DEFAULT 0 | Baris sukses |
| failed_count | INTEGER | NOT NULL, DEFAULT 0 | Baris gagal |
| errors | JSONB | NULL | `[{ "row": 12, "reason": "harga kosong" }]` |
| file_name | VARCHAR(200) | NULL | Nama file CSV |
| triggered_by_user_id | UUID | FK → users.id, NULL | Pelaku (NULL = terjadwal) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu proses |

#### Tabel: pos_column_mappings

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| entity | ENUM(`PRODUCT`,`HISTORY_IMPORT`) | NOT NULL, UNIQUE(outlet_id, entity) | Jenis file |
| mapping | JSONB | NOT NULL | `{ "Nama Produk": "name", "Harga Jual": "price" }` |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

#### Tabel: recommendation_rules

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| model_version | VARCHAR(30) | NOT NULL | mis. `fpg-20261105-0300` |
| rule_type | ENUM(`ASSOCIATION`,`POPULAR_SLOT`) | NOT NULL | Jenis |
| antecedent_item_ids | UUID[] | NULL | Item di keranjang (ASSOCIATION) |
| consequent_item_id | UUID | FK → menu_items.id, NOT NULL | Item yang direkomendasikan |
| time_slot | ENUM(`MORNING`,`LUNCH`,`AFTERNOON`,`DINNER`) | NULL | Untuk POPULAR_SLOT |
| support | REAL | NULL | Support |
| confidence | REAL | NULL | Confidence |
| lift | REAL | NULL | Lift |
| score | REAL | NOT NULL | Skor urut (lift × confidence atau frekuensi ternormalisasi) |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Hanya versi terbaru yang aktif |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu training |

#### Tabel: recommendation_models

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| model_version | VARCHAR(30) | PK | Versi model |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| transaction_count | INTEGER | NOT NULL | Jumlah transaksi latih |
| rule_count | INTEGER | NOT NULL | Jumlah rule |
| params | JSONB | NOT NULL | min_support, min_confidence, dll. |
| metrics | JSONB | NOT NULL | HitRate@3, Precision@3, coverage, baseline |
| duration_ms | INTEGER | NOT NULL | Durasi training |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu training |

#### Tabel: recommendation_events

| Kolom | Tipe Data | Constraint | Deskripsi |
|-------|-----------|------------|-----------|
| id | UUID | PK | Primary key |
| outlet_id | UUID | FK → outlets.id, NOT NULL | Outlet |
| session_id | VARCHAR(40) | NOT NULL | ID sesi anonim browser |
| menu_item_id | UUID | FK → menu_items.id, NOT NULL | Item yang direkomendasikan |
| order_id | UUID | FK → orders.id, NULL | Terisi saat konversi |
| source | ENUM(`CART_ASSOCIATION`,`POPULAR_NOW`) | NOT NULL | Jenis rekomendasi |
| event_type | ENUM(`IMPRESSION`,`CLICK`,`ADD_TO_CART`,`PURCHASED`) | NOT NULL | Jenis event |
| model_version | VARCHAR(30) | NULL | Versi model |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu event |

### 4.3 API Endpoints

Base URL: `https://api.<domain>/api`. Semua response JSON dengan format `{ "success": true, "data": ... }`.

#### Autentikasi

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/auth/login` | Login staf, set cookie access & refresh | ❌ |
| POST | `/auth/refresh` | Tukar refresh token dengan access token baru (rotasi) | 🍪 refresh |
| POST | `/auth/logout` | Cabut refresh token, hapus cookie | ✅ |
| GET | `/auth/me` | Data staf yang sedang login | ✅ |

#### Publik (Landing & Menu Digital)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/public/outlets/:slug` | Profil outlet, jam buka, lokasi, sosial | ❌ |
| GET | `/public/outlets/:slug/menu` | Kategori + item aktif (dengan harga promo) | ❌ |
| GET | `/public/outlets/:slug/promos` | Promo yang sedang aktif | ❌ |
| GET | `/public/tables/:token` | Validasi token meja | ❌ |
| POST | `/public/orders` | Buat pesanan (header `X-Table-Token`, `Idempotency-Key`) | 🎫 table token |
| GET | `/public/orders/:code` | Status & rincian pesanan | 🎫 table token |
| POST | `/public/orders/:code/pay` | Buat transaksi QRIS Midtrans / ganti metode | 🎫 table token |
| GET | `/public/recommendations` | Query `slug`, `cartItemIds`, `limit` → rekomendasi | ❌ |
| POST | `/public/recommendation-events` | Catat impression/klik/add-to-cart (batch) | ❌ |

#### Pembayaran (Webhook)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/payments/midtrans/notification` | Webhook status transaksi Midtrans | 🔏 signature |

#### Pesanan (Kasir & Admin)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/orders` | Daftar pesanan (filter `status`, `from`, `to`, `q`) | ✅ CASHIER, ADMIN |
| GET | `/orders/:id` | Detail pesanan | ✅ CASHIER, ADMIN |
| PATCH | `/orders/:id/status` | Ubah status sesuai state machine | ✅ CASHIER, ADMIN |
| POST | `/orders/:id/mark-paid` | Tandai lunas (bayar di kasir) | ✅ CASHIER, ADMIN |
| POST | `/orders/:id/cancel` | Batalkan dengan alasan | ✅ CASHIER, ADMIN |

#### Menu

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/categories` | Daftar kategori | ✅ ADMIN |
| POST | `/categories` | Buat kategori | ✅ ADMIN |
| PUT | `/categories/:id` | Ubah kategori | ✅ ADMIN |
| PATCH | `/categories/reorder` | Ubah urutan kategori | ✅ ADMIN |
| DELETE | `/categories/:id` | Hapus kategori kosong | ✅ ADMIN |
| GET | `/menu-items` | Daftar item (termasuk arsip via `?archived=true`) | ✅ CASHIER, ADMIN |
| POST | `/menu-items` | Buat item | ✅ ADMIN |
| PUT | `/menu-items/:id` | Ubah item | ✅ ADMIN |
| PATCH | `/menu-items/:id/availability` | Toggle tersedia/habis | ✅ CASHIER, ADMIN |
| POST | `/menu-items/:id/image` | Upload foto (multipart) | ✅ ADMIN |
| DELETE | `/menu-items/:id` | Arsipkan item | ✅ ADMIN |

#### Meja & QR

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/tables` | Daftar meja | ✅ ADMIN |
| POST | `/tables` | Tambah meja (bisa bulk: `{ "labels": ["A1","A2"] }`) | ✅ ADMIN |
| PUT | `/tables/:id` | Ubah label/kapasitas/status | ✅ ADMIN |
| POST | `/tables/:id/regenerate-token` | Ganti token QR | ✅ ADMIN |
| GET | `/tables/qr.pdf` | Unduh PDF QR (query `ids`, `layout=a6|a4grid`) | ✅ ADMIN |

#### Promo & Staf

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/promos` | Daftar promo | ✅ ADMIN |
| POST | `/promos` | Buat promo | ✅ ADMIN |
| PUT | `/promos/:id` | Ubah promo | ✅ ADMIN |
| DELETE | `/promos/:id` | Hapus promo | ✅ ADMIN |
| GET | `/users` | Daftar staf | ✅ ADMIN |
| POST | `/users` | Buat akun kasir | ✅ ADMIN |
| PATCH | `/users/:id` | Ubah/nonaktifkan akun | ✅ ADMIN |
| POST | `/users/:id/reset-password` | Reset password | ✅ ADMIN |

#### Analitik

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/analytics/summary` | KPI + perbandingan periode sebelumnya | ✅ ADMIN |
| GET | `/analytics/sales-trend` | Query `granularity=day|week|month` | ✅ ADMIN |
| GET | `/analytics/top-items` | Query `by=qty|revenue`, `limit` | ✅ ADMIN |
| GET | `/analytics/peak-hours` | Matriks hari × jam | ✅ ADMIN |
| GET | `/analytics/menu-engineering` | Klasifikasi Star/Plowhorse/Puzzle/Dog | ✅ ADMIN |
| GET | `/analytics/recommendation-performance` | Impression, CTR, attach rate | ✅ ADMIN |
| GET | `/analytics/export.csv` | Ekspor data tabel | ✅ ADMIN |

Semua endpoint analitik menerima query `from`, `to` (ISO date) dan `source=all|digital|olsera`.

#### Sinkronisasi Olsera

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/pos-sync/products/preview` | Unggah CSV produk → hasil pratinjau + `preview_id` | ✅ ADMIN |
| POST | `/pos-sync/products/apply` | Terapkan pratinjau (`preview_id`) | ✅ ADMIN |
| POST | `/pos-sync/history/import` | Impor riwayat transaksi Olsera (data analitik & AI) | ✅ ADMIN |
| GET | `/pos-sync/transactions/export.csv` | Ekspor transaksi lunas (`from`, `to`) | ✅ ADMIN |
| GET | `/pos-sync/mappings/:entity` | Ambil pemetaan kolom | ✅ ADMIN |
| PUT | `/pos-sync/mappings/:entity` | Simpan pemetaan kolom | ✅ ADMIN |
| GET | `/pos-sync/logs` | Riwayat sinkronisasi | ✅ ADMIN |

#### Rekomendasi (Admin) & Internal AI Service

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| GET | `/recommendations/rules` | Rule aktif teratas | ✅ ADMIN |
| GET | `/recommendations/models` | Riwayat model & metrik | ✅ ADMIN |
| POST | `/recommendations/train` | Picu training manual | ✅ ADMIN |
| GET | `reco:/internal/recommend` | (AI service) rekomendasi untuk keranjang | 🔑 `X-Internal-Key` |
| POST | `reco:/internal/train` | (AI service) training model | 🔑 `X-Internal-Key` / OIDC Scheduler |
| GET | `/health`, `reco:/health` | Health check | ❌ |

#### Event WebSocket (Socket.IO, namespace `/realtime`)

| Event | Arah | Room | Payload |
|-------|------|------|---------|
| `order.created` | Server → Kasir | `outlet:<id>:cashier` | Ringkasan pesanan |
| `order.updated` | Server → Kasir & Pelanggan | `outlet:<id>:cashier`, `order:<code>` | `{ order_code, status }` |
| `payment.updated` | Server → Kasir & Pelanggan | `outlet:<id>:cashier`, `order:<code>` | `{ order_code, payment_status }` |
| `menu.updated` | Server → Pelanggan | `outlet:<id>:menu` | `{ menu_item_id, is_available }` |

#### Contoh: `POST /api/public/orders`

Request:

```http
POST /api/public/orders
X-Table-Token: 7Gk2pQx9LmR4tVb8Ns1Zc3
Idempotency-Key: 0192f1a4-6c3e-7b2a-9d41-5f0e8c7a1b22
Content-Type: application/json
```

```json
{
  "customerName": "Rina",
  "customerPhone": "081234567890",
  "paymentMethod": "QRIS",
  "items": [
    { "menuItemId": "0192f0aa-1111-7000-8000-000000000001", "quantity": 2, "note": "sambal dipisah", "fromRecommendation": false },
    { "menuItemId": "0192f0aa-1111-7000-8000-000000000007", "quantity": 1, "fromRecommendation": true }
  ],
  "recommendationSessionId": "s_8f2c1d0e"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "orderCode": "MTW-261105-0042",
    "table": "A3",
    "status": "NEW",
    "paymentMethod": "QRIS",
    "paymentStatus": "PENDING",
    "subtotalAmount": 98000,
    "discountAmount": 4500,
    "totalAmount": 93500,
    "items": [
      { "name": "Tuna Sambal Matah", "quantity": 2, "unitPrice": 45000, "discountAmount": 4500, "lineTotal": 85500 },
      { "name": "Es Teh Serai", "quantity": 1, "unitPrice": 8000, "discountAmount": 0, "lineTotal": 8000 }
    ],
    "createdAt": "2026-11-05T05:12:44Z"
  }
}
```

> Nama menu dan harga pada contoh hanya ilustrasi; data riil diambil dari impor Olsera milik mitra.

#### Contoh: `GET /api/public/recommendations?slug=matwona&cartItemIds=...&limit=3`

```json
{
  "success": true,
  "data": {
    "source": "CART_ASSOCIATION",
    "modelVersion": "fpg-20261105-0300",
    "items": [
      { "menuItemId": "0192f0aa-1111-7000-8000-000000000007", "name": "Es Teh Serai", "price": 8000, "reason": "Sering dipesan bersama Tuna Sambal Matah", "score": 1.84 }
    ]
  }
}
```

### 4.4 Autentikasi & Otorisasi

**Strategi Autentikasi:**
- **Staf (Kasir/Admin):** JWT access token (15 menit) + refresh token (7 hari, dirotasi setiap dipakai, hash disimpan di `refresh_tokens`). Keduanya dikirim sebagai cookie `HttpOnly; Secure; SameSite=Lax`. Endpoint yang mengubah data memeriksa header `X-CSRF-Token` (double-submit cookie).
- **Pelanggan (tamu):** tidak login. Hak akses berbasis **table token** di header `X-Table-Token`; akses ke pesanan memerlukan kombinasi `order_code` + table token yang cocok.
- **Webhook Midtrans:** verifikasi `signature_key`.
- **Komunikasi API ↔ AI service:** header `X-Internal-Key` (secret) dan Cloud Run ingress internal; Cloud Scheduler memakai OIDC token.

**Alur Autentikasi Staf:**

```mermaid
sequenceDiagram
    participant U as Staf
    participant C as Web App
    participant S as NestJS API
    participant DB as PostgreSQL

    U->>C: Input email & password
    C->>S: POST /api/auth/login
    S->>DB: Cari user aktif, cek lockout
    DB-->>S: User + password_hash
    S->>S: bcrypt.compare
    S->>DB: Simpan hash refresh token
    S-->>C: Set-Cookie access (15m) & refresh (7d)
    C->>S: Request + cookie access
    S->>S: Validasi JWT & role (RolesGuard)
    S-->>C: Resource terproteksi
    C->>S: POST /api/auth/refresh (saat 401 expired)
    S->>DB: Validasi & rotasi refresh token
    S-->>C: Cookie access & refresh baru
```

**Role & Permission:**

| Permission | Pelanggan (tamu) | Kasir | Admin/Owner |
|------------|:---:|:---:|:---:|
| Lihat landing & menu | ✅ | ✅ | ✅ |
| Buat pesanan & bayar QRIS | ✅ (dengan table token) | ❌ | ❌ |
| Lihat status pesanan sendiri | ✅ | – | – |
| Lihat & ubah status pesanan | ❌ | ✅ | ✅ |
| Tandai lunas & batalkan pesanan | ❌ | ✅ | ✅ |
| Toggle ketersediaan menu | ❌ | ✅ | ✅ |
| CRUD kategori, menu, foto | ❌ | ❌ | ✅ |
| Kelola meja & cetak QR | ❌ | ❌ | ✅ |
| Kelola promo | ❌ | ❌ | ✅ |
| Kelola akun staf | ❌ | ❌ | ✅ |
| Sinkronisasi Olsera | ❌ | ❌ | ✅ |
| Analitik & performa rekomendasi | ❌ | ❌ | ✅ |
| Training ulang model | ❌ | ❌ | ✅ |

### 4.5 Error Handling

**Format Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ITEM_UNAVAILABLE",
    "message": "Beberapa menu sudah habis. Silakan perbarui keranjang.",
    "details": {
      "items": [{ "menuItemId": "0192f0aa-1111-7000-8000-000000000003", "name": "Ayam Kampung Bakar" }]
    },
    "traceId": "a1b2c3d4"
  }
}
```

Pesan `message` berbahasa Indonesia dan aman ditampilkan ke pengguna; detail teknis hanya di log (Sentry) dengan `traceId` yang sama.

**Kode Error Standar:**

| Code | HTTP Status | Deskripsi |
|------|-------------|-----------|
| VALIDATION_ERROR | 400 | Input tidak valid (detail per field) |
| INVALID_TABLE_TOKEN | 400 | Token meja tidak dikenal atau meja nonaktif |
| UNAUTHORIZED | 401 | Belum login / token kedaluwarsa |
| ACCOUNT_LOCKED | 423 | Akun terkunci karena gagal login berulang |
| FORBIDDEN | 403 | Role tidak punya akses |
| INVALID_SIGNATURE | 403 | Signature webhook tidak valid |
| NOT_FOUND | 404 | Resource tidak ditemukan |
| ITEM_UNAVAILABLE | 409 | Item habis/nonaktif saat checkout |
| PRICE_CHANGED | 409 | Harga berubah sejak keranjang dibuat |
| INVALID_STATUS_TRANSITION | 409 | Transisi status pesanan tidak diizinkan |
| PAYMENT_NOT_COMPLETED | 409 | Pesanan QRIS belum lunas |
| DUPLICATE_REQUEST | 409 | `Idempotency-Key` sudah dipakai (response awal dikembalikan) |
| SYNC_FILE_INVALID | 422 | Format CSV tidak sesuai pemetaan |
| RATE_LIMITED | 429 | Terlalu banyak permintaan |
| PAYMENT_PROVIDER_ERROR | 502 | Midtrans gagal merespons |
| RECO_UNAVAILABLE | 503 | AI service tidak tersedia (klien memakai fallback) |
| INTERNAL_ERROR | 500 | Kesalahan server |

### 4.6 Environment Variables

```env
# ---------- apps/api ----------
APP_NAME=matwona-smart-order-api
APP_PORT=4000
APP_ENV=development
APP_TIMEZONE=Asia/Jakarta
WEB_ORIGIN=http://localhost:3000

# Database & Cache
DATABASE_URL=postgresql://matwona:matwona@localhost:5432/matwona_smart_order
REDIS_URL=redis://localhost:6379

# Authentication
JWT_ACCESS_SECRET=ganti-dengan-string-acak-64-karakter
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=ganti-dengan-string-acak-64-karakter-lain
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_COST=12

# Midtrans
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
QRIS_EXPIRY_MINUTES=15

# Cloudinary
CLOUDINARY_CLOUD_NAME=matwona
CLOUDINARY_API_KEY=xxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxx

# POS Sync (olsera-csv | olsera-api | mock)
POS_SYNC_ADAPTER=olsera-csv
OLSERA_API_BASE_URL=
OLSERA_API_KEY=

# AI Service
RECO_SERVICE_URL=http://localhost:8000
RECO_INTERNAL_KEY=ganti-dengan-string-acak
RECO_TIMEOUT_MS=300

# Rate limit
ORDER_RATE_LIMIT_MAX=5
ORDER_RATE_LIMIT_WINDOW_SEC=600

# Monitoring
SENTRY_DSN=

# ---------- apps/reco ----------
RECO_DATABASE_URL=postgresql://matwona:matwona@localhost:5432/matwona_smart_order
RECO_INTERNAL_KEY=ganti-dengan-string-acak
RECO_MIN_SUPPORT=0.01
RECO_MIN_CONFIDENCE=0.2
RECO_MIN_LIFT=1.0
RECO_TRAINING_WINDOW_DAYS=180
RECO_HOLDOUT_RATIO=0.2

# ---------- apps/web ----------
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000/realtime
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
NEXT_PUBLIC_MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js
NEXT_PUBLIC_OUTLET_SLUG=matwona
NEXT_PUBLIC_GMAPS_EMBED_URL=
```

### 4.7 Panduan Deployment

**Platform:** Vercel (web) + Google Cloud Run (api, reco) + PostgreSQL terkelola (Neon atau Cloud SQL) + Upstash Redis + Cloudinary.

**Lingkungan:**

| Lingkungan | Branch | Tujuan |
|------------|--------|--------|
| Local | `feature/*` | Pengembangan via `docker compose up` |
| Staging | `develop` | Demo progres mingguan ke Dosen Pendamping & UAT mitra |
| Production | `main` | Final presentation (minggu 15) & exhibition (minggu 16) |

**Langkah Deployment:**
1. Buat project GCP, aktifkan Cloud Run, Artifact Registry, Cloud Scheduler, dan Secret Manager.
2. Provision PostgreSQL & Redis; simpan seluruh secret di Secret Manager / Vercel Environment Variables.
3. Build image `api` dan `reco` lewat GitHub Actions (`infra/Dockerfile.*`), push ke Artifact Registry, deploy ke Cloud Run (min instances = 1 selama minggu 15–16 untuk menghindari cold start saat demo).
4. Jalankan `pnpm --filter api prisma migrate deploy` dan seed data outlet Matwona.
5. Set `reco` ingress ke "internal and Cloud Load Balancing" atau proteksi `X-Internal-Key`; buat Cloud Scheduler job `0 20 * * *` UTC (= 03:00 WIB) ke `/internal/train`.
6. Hubungkan repo ke Vercel untuk `apps/web`; set domain (mis. subdomain kampus/mitra) dan HTTPS otomatis.
7. Daftarkan URL webhook `https://api.<domain>/api/payments/midtrans/notification` di dashboard Midtrans sandbox.
8. Impor CSV produk dan riwayat transaksi Olsera dari mitra, lalu jalankan training pertama.
9. Generate QR seluruh meja dan cetak untuk uji coba di outlet.

**Checklist Pre-Deployment:**
- [ ] Semua environment variables sudah di-set di setiap lingkungan
- [ ] Database migration sudah dijalankan & seed outlet tersedia
- [ ] Build production berhasil tanpa error
- [ ] Unit, integration, dan e2e test lulus di CI
- [ ] CORS hanya mengizinkan domain web; security headers (Helmet) aktif
- [ ] Webhook Midtrans diuji dengan simulator sandbox
- [ ] Health check `/health` (api & reco) merespons 200
- [ ] Sentry menerima event uji
- [ ] Backup database otomatis aktif

### 4.8 Integrasi Pihak Ketiga

| Service | Kegunaan | Dokumentasi |
|---------|----------|-------------|
| Midtrans Snap (QRIS) | Pembayaran online pelanggan | https://docs.midtrans.com |
| Olsera POS | Sumber master menu/harga/stok & tujuan ekspor transaksi (CSV sekarang, API saat akses tersedia) | Backoffice Olsera milik mitra; dokumentasi API menunggu konfirmasi dari Olsera |
| Cloudinary | Penyimpanan & optimasi foto menu | https://cloudinary.com/documentation |
| Google Maps Embed | Peta lokasi di landing page | https://developers.google.com/maps/documentation/embed |
| mlxtend | FP-Growth & association rules | https://rasbt.github.io/mlxtend/ |
| Socket.IO | Realtime kasir & pelanggan | https://socket.io/docs/v4/ |
| Sentry | Error tracking | https://docs.sentry.io |

### 4.9 Panduan Desain UI (Brand Guideline Matwona)

| Token | Nilai | Pemakaian |
|-------|-------|-----------|
| `--color-primary` | `#106f4d` (sea green) | Tombol utama, header, teks link. Kontras dengan putih ±6,2:1 dan dengan `#ffffca` ±6:1 (lolos WCAG AA) |
| `--color-accent` | `#069d70` (teal old green) | Aksen, badge, ikon, latar section besar. Kontras dengan putih hanya ±3,5:1, jadi **jangan** dipakai untuk teks kecil putih (boleh untuk teks ≥ 24 px/bold ≥ 18,7 px) |
| `--color-cream` | `#ffffca` (soft shade of yellow) | Latar kartu/section, teks di atas latar hijau tua |
| `--color-ink` | `#1f2a24` | Teks body di atas latar terang |
| `--color-danger` | `#c0392b` | Error, label "Habis" |
| Font utama | Mosvita | Heading & body. Jika lisensi/file tidak tersedia, gunakan fallback **Plus Jakarta Sans** (Google Fonts) |
| Logo | File SVG logo Matwona dari mitra | Font logo (Anton) **hanya** untuk logo, tidak dipakai di UI |
| Karakter visual | Hangat, personal, "warung" modern, bukan mewah | Foto produk tuna & ayam kampung dengan tone natural sesuai halaman "Tone & Photo implementation" |

Prinsip UI: mobile-first, satu aksi utama per layar, tombol "Tambah" besar di kartu menu, keranjang sebagai bottom sheet dengan total yang selalu terlihat.

---

## Lampiran A: Pemetaan ke Komponen Penilaian Computing Project

| Sub-CLO | Komponen Penilaian (Bobot) | Bagian PRD / Artefak Turunan | Bukti yang Disiapkan |
|---------|---------------------------|------------------------------|----------------------|
| 09-1-1 (25%) | Kompleksitas Use Case (5%) | 1.2, 1.8, Lampiran A (tabel kriteria di bawah) | Proposal: pemenuhan kriteria solusi & tolok ukur kompleksitas |
| 09-1-1 | BRS (5%) | 1.2, 1.3, 1.4, 1.7 | Dokumen BRS: proses bisnis as-is vs to-be Matwona, stakeholder, batasan |
| 09-1-1 | Collaboration with Mitra (5%) | Lampiran G, Lampiran E (UAT) | Notulen meeting bertanda tangan/konfirmasi mitra, logbook, feedback mockup, surat/chat konfirmasi |
| 09-1-1 | SRS: Requirement Analysis (10%) | 1.5, 1.6, Bagian 2 (user story + acceptance criteria) | Dokumen SRS dengan traceability FR → fitur → test case |
| 09-1-2 (20%) | SDD (5%) | Bagian 3 & 4 | Arsitektur, ERD, DFD/sequence, desain API, desain model AI |
| 09-1-2 | Proposed Solution/Technology (5%) | 1.8, 2.2.10, 2.2.11 | Justifikasi stack, ADR, PoC FP-Growth pada data Olsera |
| 09-1-2 | Prototype UI/UX (5%) | 2.2.x, 4.9 | Figma: user flow, wireframe, mockup hi-fi, hasil validasi dengan mitra |
| 09-1-2 | Progress Report/Presentation (5%) | Lampiran B | Slide progres per sprint, demo MVP minggu 9 |
| 10-2-1 (55%) | Testing & QA / UAT (5%) | Lampiran E | Test plan, test case, laporan defect, UAT bertanda tangan mitra, skor SUS |
| 10-2-1 | Sprint Progress (5%) | Lampiran B, NFR-019 | GitHub Projects board, riwayat commit/PR, sprint review notes |
| 10-2-1 | User Guide/Manual (5%) | 4.7, Bagian 2 | Panduan pelanggan, kasir, admin (termasuk prosedur sinkron CSV), troubleshooting |
| 10-2-1 | Business Plan / Go-to-Market (5%) | Lampiran F | Value proposition, target pasar, model bisnis, roadmap |
| 10-2-1 | Presentasi (5%) & Tanya-jawab (5%) | Seluruh dokumen | Slide final, demo live, Q&A bank |
| 10-2-1 | Final Product Quality (4%) | NFR, 4.7 | Produk ter-deploy stabil, demo di booth |
| 10-2-1 | Poster (3%) & Video (3%) | 4.9 | Poster & video teaser sesuai brand Matwona |
| 10-2-1 | Individual Contribution (15%) | Lampiran C | Commit history, task board, logbook per anggota |

**Pemenuhan kriteria kompleksitas (panduan ComPro):**

| Kriteria | Terpenuhi | Implementasi |
|----------|:---:|--------------|
| Kriteria solusi a: Penerapan Teknologi AI | ✅ | Model rekomendasi menu (association rules + time-aware popularity) |
| Kriteria solusi b: Implementasi Teknik Data Mining | ✅ | FP-Growth (asosiasi item), menu engineering, analisis jam ramai |
| Kriteria solusi e: Penggunaan Teknologi Cloud | ✅ | Cloud Run, Vercel, PostgreSQL & Redis terkelola, Cloud Scheduler |
| Kriteria solusi c: Keamanan (pendukung) | ➕ | JWT + RBAC, verifikasi signature webhook, rate limiting, token QR acak |
| Tolok ukur 1: Integrasi Teknologi | ✅ | Integrasi POS Olsera, payment gateway, AI service, realtime |
| Tolok ukur 2: Volume & Variabilitas Data | ✅ | Impor riwayat transaksi Olsera (format eksternal) + data pesanan digital, preprocessing untuk mining |
| Tolok ukur 3: Interaksi & UX | ✅ | Tiga kelompok pengguna berbeda (pelanggan, kasir, owner) dengan kebutuhan antarmuka berbeda |
| Tolok ukur 6: Kolaborasi/Jaringan | ✅ | Sinkronisasi realtime antar aktor (pelanggan ↔ kasir) |

**Peluang HKI:** produk dapat diajukan Hak Cipta melalui MyBTP oleh Dosen Pendamping setelah mendapat persetujuan mitra dan kesepakatan seluruh anggota tim. Dokumen pendukung (deskripsi produk, screenshot, user guide) dapat dikompilasi dari deliverables.

---

## Lampiran B: Rencana Sprint & Timeline

Diasumsikan hari ini (30 Oktober 2026) berada di **minggu ke-7** perkuliahan. Tanggal persis setiap minggu mengikuti kalender akademik. Sprint berdurasi 1–2 minggu dengan sprint review saat bimbingan Dosen Pendamping.

| Minggu | Sprint | Target Utama | Deliverable Penilaian |
|--------|--------|--------------|-----------------------|
| 7 | Sprint 0: Fondasi | Finalisasi PRD/BRS/SRS; validasi kebutuhan dengan mitra; minta contoh export Olsera; setup monorepo, CI, docker compose; wireframe Figma | BRS & SRS draft, notulen mitra |
| 8 | Sprint 1: Core Order | Skema DB + seed; menu digital via QR; keranjang & checkout "bayar di kasir"; dashboard kasir realtime; login staf; CRUD menu dasar; mockup hi-fi divalidasi mitra | Mockup Figma, SDD draft |
| 9 | **MVP Review** | Demo alur end-to-end: scan QR → pesan → masuk kasir → tandai lunas. PoC FP-Growth di notebook dengan data Olsera | **Penilaian proposal & desain produk** (Proposal, SRS, Technical Document) |
| 10–11 | Sprint 2: Payment & Admin | QRIS Midtrans + webhook; status pesanan pelanggan; manajemen meja & PDF QR; landing page; sinkronisasi Olsera CSV (impor produk, ekspor transaksi, log) | Progress report |
| 12–13 | Sprint 3: Intelligence | AI service (training, rekomendasi, fallback, evaluasi); dashboard analitik & menu engineering; promo; deploy staging; uji coba di outlet | Progress report, laporan evaluasi model |
| 14 | Sprint 4: Hardening & UAT | UAT bersama mitra; perbaikan bug; performance & security check; user guide; business plan; poster & video | UAT document, draft final report |
| 15 | **Beta Release** | Deploy production; final presentation ke Dosen Pendamping | Final report, presentasi & demo |
| 16 | **Exhibition** | Demo di booth: QR meja nyata, dashboard kasir & owner, poster, video | Exhibition (produk, poster, video) |

**Definisi MVP (minggu 9):** FR-001 s.d. FR-004, FR-006, FR-008, FR-009, FR-010 (dasar) berjalan di staging. Fitur lain boleh masih dalam bentuk mockup.

**Definition of Done per fitur:** kode di-review & di-merge ke `develop`, acceptance criteria lulus, test tertulis, dokumentasi API diperbarui, dan sudah dideploy ke staging.

---

## Lampiran C: Pembagian Peran Tim

Tim terdiri dari 7 anggota. Nama diisi oleh tim sesuai hasil profiling dan pembagian dari dosen kelas.

| Peran | Jumlah | Tanggung Jawab Utama | Modul/Artefak |
|-------|:---:|----------------------|----------------|
| Project Manager & Business Analyst | 1 | Koordinasi sprint, komunikasi mitra & Olsera, notulen, business plan, peer assessment | Lampiran B, F, G; logbook |
| System Analyst | 1 | BRS, SRS, traceability, SDD, ERD | Dokumen BRS/SRS/SDD |
| UI/UX Designer & Front-end Developer | 1 | Figma, design system brand, landing page, menu digital | `apps/web` (landing, menu) |
| Front-end Developer | 1 | Dashboard kasir & admin, grafik analitik, realtime client | `apps/web` (cashier, admin) |
| Back-end Developer | 1 | NestJS API, auth, orders, payments, pos-sync, realtime, deployment | `apps/api`, `infra` |
| AI/ML & Data Engineer | 1 | EDA data Olsera, AI service, evaluasi model, query analitik | `apps/reco`, `modules/analytics` |
| System Tester & Marketing Specialist | 1 | Test plan, test case, UAT, laporan defect, poster & video promosi | Dokumen UAT, poster, video |

Setiap anggota mencatat aktivitas di logbook dan task board, serta melakukan commit atas namanya sendiri sebagai bukti kontribusi individual (bobot 15%).

---

## Lampiran D: Risiko & Mitigasi

| ID | Risiko | Dampak | Kemungkinan | Mitigasi |
|----|--------|--------|-------------|----------|
| R-01 | Akses API Olsera tidak didapat sampai akhir semester | Sinkronisasi tidak realtime | Tinggi | Adapter pattern + CSV import/export (FR-013). PM mengirim permintaan akses partner ke Olsera di minggu 7 dan menyimpan buktinya. Jika Olsera tidak mendukung impor transaksi, CSV ekspor dipakai untuk rekonsiliasi harian dan kasir tetap mencatat di Olsera |
| R-02 | Format export Olsera berbeda dari asumsi | Impor gagal | Sedang | Pemetaan kolom yang bisa dikonfigurasi + pratinjau; minta contoh file asli sedini mungkin |
| R-03 | Data transaksi historis sedikit (cold start) | Rule asosiasi lemah | Sedang | Fallback "Populer sekarang"; turunkan `min_support` setelah EDA; data pesanan digital selama uji coba menambah data |
| R-04 | Mitra belum punya akun Midtrans produksi | QRIS hanya bisa demo sandbox | Tinggi | Demo memakai sandbox simulator; opsi "bayar di kasir" tetap fungsional; aktivasi produksi masuk roadmap |
| R-05 | Jumlah meja berubah-ubah | QR perlu dicetak ulang | Sedang | Manajemen meja dinamis + regenerate & cetak PDF QR kapan saja |
| R-06 | Internet outlet tidak stabil | Pesanan terlambat sampai kasir | Sedang | Reconnect otomatis + polling fallback; notifikasi koneksi di dashboard kasir |
| R-07 | Scope terlalu besar untuk ±9 minggu | Fitur tidak selesai | Sedang | Prioritas MoSCoW; fitur Should/Could dipotong lebih dulu; MVP minggu 9 fokus pada alur inti |
| R-08 | Penyalahgunaan QR (pesanan iseng dari luar outlet) | Pesanan palsu | Rendah | Rate limit, regenerate token, pesanan "bayar di kasir" wajib dikonfirmasi kasir sebelum diproses |
| R-09 | Cold start Cloud Run saat demo | Respons lambat di depan penguji | Sedang | `min-instances=1` selama minggu 15–16; warm-up request sebelum presentasi |
| R-10 | Lisensi font Mosvita tidak tersedia | Tampilan beda dari brand | Rendah | Fallback Plus Jakarta Sans; konfirmasi file font ke mitra |

---

## Lampiran E: Strategi Pengujian & UAT

| Level | Tools | Cakupan | Penanggung Jawab |
|-------|-------|---------|------------------|
| Unit test | Vitest (api, web), Pytest (reco) | Kalkulasi harga & promo, state machine, signature webhook, parser CSV, miner FP-Growth | Developer modul |
| Integration test | Supertest + Postgres container | Endpoint orders, payments (webhook simulasi), pos-sync | Back-end |
| E2E test | Playwright | Alur pelanggan scan → pesan → kasir menerima; admin impor CSV | Tester |
| Performance test | k6 | NFR-002, NFR-003 (50 pengguna konkuren) | Tester + Back-end |
| Security check | OWASP ZAP baseline, `npm audit`, `pip-audit` | Header keamanan, auth, rate limit | Back-end + Tester |
| Evaluasi model | Notebook + `evaluate.py` | HitRate@3, Precision@3, coverage vs baseline | AI/ML |
| UAT | Skenario UAT + kuesioner SUS | Owner, kasir, dan minimal 10 pelanggan uji di outlet Matwona | Tester + PM bersama mitra |

**Contoh skenario UAT:**

| ID | Skenario | Aktor | Hasil yang Diharapkan |
|----|----------|-------|------------------------|
| UAT-01 | Pelanggan scan QR meja, pesan 2 item, bayar di kasir | Pelanggan, Kasir | Pesanan tampil di kasir ≤ 2 detik; kasir menandai lunas; status pelanggan berubah |
| UAT-02 | Pelanggan bayar QRIS (sandbox) | Pelanggan | Status otomatis "Lunas" tanpa campur tangan kasir |
| UAT-03 | Owner menandai menu habis | Owner | Menu tidak bisa dipesan pelanggan |
| UAT-04 | Owner impor CSV produk dari Olsera | Owner | Pratinjau benar; harga di menu digital sama dengan Olsera |
| UAT-05 | Owner ekspor transaksi minggu ini | Owner | CSV berisi semua pesanan lunas dengan total sesuai dashboard |
| UAT-06 | Pelanggan menambah item dari rekomendasi | Pelanggan | Item masuk keranjang; event tercatat di performa rekomendasi |
| UAT-07 | Owner melihat analitik 30 hari | Owner | Omzet & menu terlaris sesuai data uji |
| UAT-08 | Owner menambah meja baru dan mencetak QR | Owner | QR baru langsung bisa dipakai memesan |

**Metrik keberhasilan produk (diukur saat uji coba di outlet):**
- Waktu rata-rata dari scan QR sampai pesanan terkonfirmasi < 3 menit.
- ≥ 90% pesanan uji berhasil tanpa bantuan staf.
- Skor SUS ≥ 70.
- Attach rate rekomendasi ≥ 10% pesanan.
- Selisih data transaksi Smart Order vs Olsera setelah rekonsiliasi = 0.

---

## Lampiran F: Ringkasan Business Plan & Roadmap Produk

**Value Proposition:**
- *Untuk Matwona:* layanan lebih cepat saat jam ramai, menu selalu akurat, omzet naik lewat rekomendasi, dan keputusan bisnis berbasis data tanpa meninggalkan Olsera yang sudah dipakai.
- *Untuk pelanggan:* pesan dan bayar dari meja tanpa antre, tanpa unduh aplikasi, tanpa membuat akun.

**Target Pasar (setelah pilot Matwona):** UMKM F&B dine-in skala kecil-menengah (1–5 outlet) di Bandung dan kota besar lain yang sudah memakai POS cloud seperti Olsera, tetapi belum punya menu digital dan analitik.

**Pembeda dari solusi sejenis:** menu QR umumnya berhenti di pemesanan. Smart Order menambahkan rekomendasi berbasis data transaksi outlet itu sendiri dan analitik menu engineering yang mudah dipahami owner UMKM, serta dirancang untuk melengkapi POS yang sudah ada, bukan menggantikannya.

**Model Bisnis (usulan):**
- SaaS berlangganan bulanan per outlet (paket Basic: menu QR + kasir; paket Pro: + rekomendasi AI, analitik, sinkron POS).
- Biaya setup satu kali (foto menu, cetak QR berdesain brand).
- Pilot gratis untuk Matwona sebagai studi kasus dan testimoni.

**Strategi Go-to-Market:**
1. Pilot di Matwona selama minggu 12–16; kumpulkan metrik sebelum/sesudah.
2. Studi kasus dan video testimoni untuk exhibition dan media sosial.
3. Pendekatan ke komunitas UMKM F&B dan kemitraan dengan penyedia POS.

**Roadmap Inovasi Lanjutan:**

| Versi | Target | Fitur |
|-------|--------|-------|
| v1.0 | Akhir semester (minggu 15–16) | Seluruh fitur Must & Should dalam PRD ini |
| v1.1 | +1–2 bulan | Adapter API Olsera (jika akses diberikan), cetak struk thermal, panggil pelayan |
| v2.0 | +3–6 bulan | Kitchen Display System, multi-outlet, program loyalitas berbasis no. HP, pre-order/takeaway dari landing page |
| v3.0 | +6–12 bulan | Multi-tenant SaaS untuk UMKM lain, prediksi permintaan bahan (tuna & ayam) dengan time-series forecasting, rekomendasi personal berbasis riwayat pelanggan, integrasi POS lain |

---

## Lampiran G: Pertanyaan Terbuka untuk Mitra

| No | Pertanyaan | Dibutuhkan Untuk | Target Jawaban |
|----|-----------|------------------|----------------|
| 1 | Jumlah dan penamaan meja saat ini serta rencana penambahan | Manajemen meja & cetak QR | Minggu 8 |
| 2 | Contoh file export **produk** dan **riwayat transaksi** (≥ 3 bulan) dari backoffice Olsera | Pemetaan CSV, data latih AI, analitik | Minggu 7–8 |
| 3 | Apakah backoffice Olsera mitra mendukung impor transaksi? Apakah mitra bersedia membantu meminta akses API ke Olsera? | Desain sinkronisasi transaksi | Minggu 8 |
| 4 | Apakah mitra memiliki atau bersedia membuat akun Midtrans? | Aktivasi QRIS produksi | Minggu 10 |
| 5 | Foto menu resmi, deskripsi menu, alamat, jam buka, dan akun media sosial | Landing page & menu digital | Minggu 8 |
| 6 | File logo SVG dan font Mosvita | Penerapan brand | Minggu 8 |
| 7 | Perangkat yang tersedia di kasir (tablet/laptop/printer thermal) | Desain dashboard kasir & fitur cetak | Minggu 8 |
| 8 | Jadwal yang memungkinkan untuk uji coba dan UAT di outlet | Lampiran E | Minggu 12 |
| 9 | Kesediaan menjadi studi kasus & persetujuan pengajuan HKI | Exhibition & HKI | Minggu 14 |

---

## 📝 Catatan Revisi

| Versi | Tanggal | Perubahan | Author |
|-------|---------|-----------|--------|
| 1.0 | 30 Oktober 2026 | Dokumen awal berdasarkan notulensi mitra Matwona, Panduan Computing Project 2026, dan Brand Guideline Matwona | Tim Computing Project |
| 1.1 | 30 Oktober 2026 | Versi stack diselaraskan dengan scaffold repo: Next.js 16, NestJS 12 (ESM), Prisma 7, Tailwind CSS v4, TypeScript 6, Vitest | Tim Computing Project |

---

> 📌 **Dokumen ini adalah referensi utama (single source of truth) untuk pengembangan Matwona Smart Order.
> Semua keputusan teknis dan fungsional harus merujuk pada dokumen ini.**
