# Backlog — Matwona Smart Order

Diturunkan dari `docs/PRD.md` (Lampiran B). Centang `[x]` saat task memenuhi Definition of Done (lihat `CLAUDE.md`).
Kolom **Peran** mengikuti Lampiran C PRD: PM, SA (System Analyst), FE1 (UI/UX + FE), FE2, BE, AI (AI/ML & Data), QA (Tester & Marketing).

Prioritas: 🔴 Must · 🟡 Should · 🟢 Could

---

## Sprint 0 — Fondasi (Minggu 7)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [x] | S0-01 | Scaffold monorepo, CLAUDE.md, docs, docker compose | – | 🔴 | BE | – |
| [x] | S0-02 | `pnpm install` lulus; `pnpm dev` menjalankan web & api kosong; `/health` API 200 | NFR-017 | 🔴 | BE | S0-01 |
| [x] | S0-03 | CI GitHub Actions: lint, typecheck, test (Node) + ruff & pytest (reco) | NFR-019 | 🔴 | BE | S0-02 |
| [x] | S0-04 | Prisma migrate pertama dari `schema.prisma` + seed (outlet, admin, kasir, kategori, menu contoh, 10 meja) | 4.2 | 🔴 | BE | S0-02 |
| [x] | S0-05 | Design token brand di `globals.css` + komponen dasar (Button, Card, Badge, Input, BottomSheet) | 4.9, NFR-014 | 🔴 | FE1 | S0-02 |
| [x] | S0-06 | Wireframe & mockup UI (kanvas Claude Design, lihat `docs/design/BRAND.md`): menu, keranjang, checkout, status, kasir, admin, landing | FR-001…008 | 🔴 | FE1 | – |
| [ ] | S0-07 | Finalisasi BRS & SRS draft (`docs/compro/`) + notulen validasi mitra | – | 🔴 | SA, PM | – |
| [ ] | S0-08 | Minta contoh export produk & transaksi Olsera + konfirmasi akses API (simpan bukti). *28 Nov: API key Olsera sudah didapat & dicoba, akses menunggu approval Olsera; lanjut di S3-27* | Lampiran G | 🔴 | PM | – |

## Sprint 1 — Core Order (Minggu 8) → target MVP minggu 9

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [x] | S1-01 | Modul `auth`: login, refresh (rotasi), logout, me, lockout 5x, `JwtAuthGuard`, `RolesGuard` | FR-009 | 🔴 | BE | S0-04 |
| [x] | S1-02 | Modul `tables`: `GET /public/tables/:token`, CRUD meja admin | FR-001, FR-011 | 🔴 | BE | S0-04 |
| [x] | S1-03 | Modul `menu`: `GET /public/outlets/:slug/menu` (cache Redis 60 s), CRUD kategori & item, toggle availability, arsip | FR-002, FR-010 | 🔴 | BE | S0-04 |
| [x] | S1-04 | Halaman menu digital `/m/[outlet]/t/[token]`: header meja, tab kategori sticky, kartu menu, label Habis, pencarian | FR-001, FR-002 | 🔴 | FE1 | S1-02, S1-03 |
| [x] | S1-05 | Keranjang (Zustand + localStorage per token), catatan item, bottom sheet total | FR-003 | 🔴 | FE1 | S1-04 |
| [x] | S1-06 | Modul `orders`: `POST /public/orders` (idempotency, hitung ulang harga, lock stok, rate limit) metode CASHIER | FR-004, FR-006, NFR-007, NFR-009 | 🔴 | BE | S1-03 |
| [x] | S1-07 | `order-status.machine.ts` + endpoint `PATCH /orders/:id/status`, `mark-paid`, `cancel` (kembalikan stok) | FR-006, FR-008 | 🔴 | BE | S1-06 |
| [x] | S1-08 | Gateway Socket.IO `/realtime` (auth handshake JWT, room kasir & order) + event `order.created/updated` | FR-008, NFR-002 | 🔴 | BE | S1-06 |
| [x] | S1-09 | Halaman checkout (nama, HP opsional, pilih metode) + halaman status pesanan realtime | FR-004, FR-007 | 🔴 | FE1 | S1-06, S1-08 |
| [x] | S1-10 | Dashboard kasir: login, kolom status, kartu pesanan, suara notifikasi, tandai lunas, batal, banner koneksi | FR-008 | 🔴 | FE2 | S1-07, S1-08 |
| [x] | S1-11 | Admin: halaman kelola menu (CRUD, toggle) | FR-010 | 🔴 | FE2 | S1-03 |
| [ ] | S1-12 | EDA data transaksi Olsera + PoC FP-Growth di notebook | FR-015 | 🔴 | AI | S0-08 |
| [ ] | S1-13 | Deploy staging (Vercel + Cloud Run + DB) dan demo MVP end-to-end | – | 🔴 | BE | S1-01…S1-11 |
| [ ] | S1-14 | SDD draft + slide progres untuk penilaian minggu 9 | – | 🔴 | SA, PM | – |

## Sprint 2 — Payment & Admin (Minggu 10–11)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [x] | S2-01 | Modul `payments`: `POST /public/orders/:code/pay` (Midtrans Snap QRIS, expiry 15 menit) | FR-005 | 🔴 | BE | S1-06 |
| [x] | S2-02 | Webhook Midtrans: verifikasi signature, idempoten, update status, emit `payment.updated`, kembalikan stok saat expire | FR-005, NFR-008 | 🔴 | BE | S2-01 |
| [ ] | S2-03 | UI pembayaran QRIS + pilih ulang metode saat gagal. *Prioritas turun: QRIS dimatikan untuk Matwona (24 Nov); barcode QRIS dinamis sudah ada (`fb2a196`)* | FR-005 | 🟡 | FE1 | S2-01 |
| [x] | S2-04 | Generate & regenerate token QR, `GET /tables/qr.pdf` berdesain brand | FR-011 | 🔴 | BE | S1-02 |
| [x] | S2-05 | Admin: halaman meja & cetak QR | FR-011 | 🔴 | FE2 | S2-04 |
| [ ] | S2-06 | Landing page (SSG/ISR): hero, cerita brand, menu read-only, promo, lokasi, WhatsApp, SEO + schema.org Restaurant | FR-012 | 🔴 | FE1 | S1-03 |
| [x] | S2-07 | `PosSyncAdapter` + `OlseraCsvAdapter`: preview & apply impor produk, pemetaan kolom tersimpan | FR-013 | 🔴 | BE | S0-08, S1-03 |
| [x] | S2-08 | Ekspor transaksi lunas ke CSV + `pos_sync_logs` + `MockOlseraAdapter` untuk test | FR-013, FR-014 | 🔴 | BE | S2-07 |
| [x] | S2-09 | Impor riwayat transaksi Olsera (`source = OLSERA_IMPORT`) untuk analitik & AI | FR-013 | 🔴 | BE, AI | S2-07 |
| [ ] | S2-10 | Admin: halaman sinkronisasi (unggah, pemetaan kolom, pratinjau, log, ekspor) | FR-013, FR-014 | 🔴 | FE2 | S2-07, S2-08 |
| [x] | S2-11 | Upload foto menu ke Cloudinary | FR-010 | 🟡 | BE | S1-03 |
| [x] | S2-12 | Admin: kelola akun staf | FR-021 | 🟡 | FE2, BE | S1-01 |
| [x] | S2-13 | Selaraskan UI dengan mockup S0-06: (1) token & komponen dasar, (2) alur pelanggan C1–C4/C6/C7, (3) login & kasir K1–K3, (4) admin menu & meja A2–A3 (PR #18–#22) | NFR-012, NFR-014 | 🟡 | FE1, FE2 | S0-06 |

## Sprint 3 — Intelligence (Minggu 12–13)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S3-01 | `apps/reco`: training FP-Growth + popularitas per slot, simpan `recommendation_rules` & `recommendation_models` | FR-015, FR-016, FR-022 | 🔴 | AI | S2-09 |
| [ ] | S3-02 | Evaluasi offline holdout: HitRate@3, Precision@3, coverage vs baseline terlaris | FR-015 | 🔴 | AI | S3-01 |
| [x] | S3-03 | `GET /internal/recommend` + proxy API `GET /public/recommendations` dengan timeout & fallback | FR-015, NFR-004, NFR-020 | 🔴 | AI, BE | S3-01 |
| [ ] | S3-04 | UI "Populer sekarang" & "Sering dibeli bersama" + pencatatan `recommendation_events` | FR-015, FR-016, FR-019 | 🔴 | FE1 | S3-03 |
| [ ] | S3-05 | Modul `analytics`: summary, sales-trend, top-items, peak-hours, menu-engineering, export | FR-017, FR-018 | 🔴 | AI, BE | S2-09 |
| [ ] | S3-06 | Dashboard analitik admin (Recharts, palet brand, filter tanggal & sumber) | FR-017, FR-018 | 🔴 | FE2 | S3-05 |
| [ ] | S3-07 | Performa rekomendasi (impression, CTR, attach rate) + halaman rule & model | FR-019, FR-022 | 🟡 | AI, FE2 | S3-04 |
| [x] | S3-08 | Modul & halaman promo, penerapan otomatis saat checkout | FR-020 | 🟡 | BE, FE2 | S1-06 |
| [ ] | S3-09 | Cloud Scheduler retrain harian 03:00 WIB | FR-022 | 🟡 | AI | S3-01 |
| [ ] | S3-10 | Uji coba di outlet Matwona (QR tercetak, data pesanan riil) | – | 🔴 | PM, QA | S2-* |

## Sprint 3B — Masukan Mitra 24 Nov (Minggu 11–13, target 7 Des, paling lambat 14 Des)

Sumber: [notulen & analisis gap](notulen/2026-11-24-analisis-gap-diskusi-mitra.md). S3-11 s.d. S3-17 **sudah ada kodenya** di commit `fc6dbba`, dan seluruh test yang ada lulus (28 Nov: API 194/194, web 201/201). Sebagian belum punya test: modul `outlet` (pengaturan, tes printer/notifikasi), `notifications`, penolakan QRIS saat dimatikan, dan `PATCH /staff/:id/pin`. Centang setelah test-nya ditambahkan, acceptance criteria di PRD 2.2.14–2.2.19 diverifikasi, dan tampilan dicek di 360 px.

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S3-11 | Mode layanan (`SELF_PICKUP_PAGER`/`TABLE_SERVICE`) + toggle QRIS di pengaturan outlet, penolakan QRIS di server, instruksi "bayar di kasir & ambil pager" di status pesanan | FR-026, FR-005 | 🔴 | BE, FE2 | – |
| [ ] | S3-12 | Varian menu dalam satu kartu + pop-up pilih varian & level pedas + pop-up daftar kategori | FR-027 | 🟡 | FE1, BE | – |
| [ ] | S3-13 | Station printer per kategori, pemecahan struk kasir + tiket dapur/bar, ESC/POS LAN, tes printer, preview cetak di kasir | FR-024 | 🔴 | BE, FE2 | – |
| [ ] | S3-14 | Notifikasi pesanan baru & stok menipis ke Telegram + webhook WhatsApp, tombol tes notifikasi | FR-029 | 🟡 | BE | – |
| [ ] | S3-15 | Pengingat cek stok di dashboard kasir (jam diatur admin) + sheet cek stok + event `stock.reminder` | FR-028 | 🟡 | FE2, BE | – |
| [ ] | S3-16 | Absensi staf dengan PIN (atur PIN, absen masuk/pulang, rekap admin) | FR-030 | 🟢 | BE, FE2 | – |
| [ ] | S3-17 | Kuota promo (`maxQuantity`/`usedQuantity`), dikembalikan saat batal/kedaluwarsa | FR-020 | 🟡 | BE | S3-08 |
| [ ] | S3-18 | Mode *self pick-up*: pesanan bayar di kasir wajib `PAID` sebelum `CONFIRMED` (aturan di `order-status.machine.ts` + test) | FR-026 | 🔴 | BE | S3-11 |
| [ ] | S3-19 | Nomor pager opsional saat tandai lunas (`orders.pager_number`), tampil di kartu kasir, tiket, dan status pelanggan | FR-026 | 🟡 | BE, FE2 | S3-18 |
| [ ] | S3-20 | Agen cetak lokal di perangkat kasir: terima tiket lewat Socket.IO, teruskan ke IP printer LAN (pengganti kirim TCP dari server cloud) | FR-024, R-11 | 🔴 | BE | S3-13 |
| [ ] | S3-21 | Cetak otomatis tiket station saat pesanan lunas (*self pick-up*) / dikonfirmasi (layanan meja) + cetak ulang manual | FR-024 | 🔴 | FE2, BE | S3-13, S3-20 |
| [ ] | S3-22 | Uji cetak di outlet: printer dapur LAN "Silicon" & printer depan Bluetooth di tablet (termasuk aplikasi perantara bila perlu), catat hasil | FR-024, R-12 | 🔴 | QA, PM | S3-20, S3-21 |
| [ ] | S3-23 | Pengingat stok terjadwal dari server (sesuai `stock_reminder_hours`) ke Telegram/WhatsApp, tanpa perlu dashboard terbuka | FR-028 | 🟡 | BE | S3-14, S3-15 |
| [ ] | S3-24 | Pindahkan pemanggilan Olsera dari `pos-sync/olsera-test.service.ts` ke folder `adapters/` (aturan 7 CLAUDE.md) | FR-023 | 🟡 | BE | – |
| [ ] | S3-25 | Batasi percobaan PIN absensi salah (mis. 5×/10 menit per staf) | FR-030, NFR-006 | 🟢 | BE | S3-16 |
| [ ] | S3-26 | Petakan kolom varian (`variant_group`, `variant_label`, `spice_level`) di impor CSV produk Olsera | FR-027, FR-013 | 🟢 | BE | S3-12 |
| [ ] | S3-27 | Tindak lanjut approval Olsera Open API, simpan bukti, dan tanyakan apakah API bisa membuat pesanan (open order) | FR-023, R-01 | 🔴 | PM | S0-08 |

## Sprint 4 — Hardening & UAT (Minggu 14)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S4-01 | E2E Playwright alur pelanggan → kasir & impor CSV admin | Lampiran E | 🔴 | QA | S3-* |
| [ ] | S4-02 | Uji performa k6 (50 pengguna) & Lighthouse (menu, landing) | NFR-001…003 | 🔴 | QA, BE | S3-* |
| [ ] | S4-03 | OWASP ZAP baseline, `pnpm audit`, `pip-audit`, perbaikan temuan | NFR-005…011 | 🔴 | QA, BE | S3-* |
| [ ] | S4-04 | UAT bersama mitra (UAT-01…08) + kuesioner SUS | Lampiran E | 🔴 | QA, PM | S3-10 |
| [ ] | S4-05 | User guide pelanggan, kasir, admin (`docs/user-guide/`) | – | 🔴 | SA, QA | S3-* |
| [ ] | S4-06 | Business plan / go-to-market final | Lampiran F | 🔴 | PM | – |
| [ ] | S4-07 | Poster & video promosi produk | – | 🔴 | QA, FE1 | – |
| [ ] | S4-08 | ~~Cetak ringkasan pesanan (print CSS 58/80 mm)~~ Digantikan S3-13 & S3-21 (FR-024 naik ke Must) | FR-024 | – | FE2 | S3-13 |

## Rilis

| | ID | Task | Minggu |
|---|----|------|--------|
| [ ] | R-01 | Deploy production (`main`), `min-instances=1`, warm-up | 15 |
| [ ] | R-02 | Final presentation & demo ke Dosen Pendamping | 15 |
| [ ] | R-03 | Exhibition: booth, QR meja contoh, dashboard, poster, video | 16 |

## Parkir (Could / Won't v1)

- FR-023 Adapter API Olsera, termasuk kirim pesanan lunas ke Olsera sebagai alternatif jalur cetak (aktifkan setelah approval Olsera keluar; lihat S3-27)
- FR-025 Panggil pelayan
- Perhitungan HPP & margin per menu (masukan mitra 24 Nov)
- Saran operasional dari analisis jam ramai (kapan siapkan stok/staf)
- Varian dua dimensi (ukuran × sambal dalam satu pop-up)
- Kitchen Display System, multi-outlet, loyalitas (roadmap v2)
