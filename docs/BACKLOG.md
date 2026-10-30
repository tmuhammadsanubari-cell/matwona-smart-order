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
| [ ] | S0-03 | CI GitHub Actions: lint, typecheck, test (Node) + ruff & pytest (reco) | NFR-019 | 🔴 | BE | S0-02 |
| [ ] | S0-04 | Prisma migrate pertama dari `schema.prisma` + seed (outlet, admin, kasir, kategori, menu contoh, 10 meja) | 4.2 | 🔴 | BE | S0-02 |
| [ ] | S0-05 | Design token brand di `globals.css` + komponen dasar (Button, Card, Badge, Input, BottomSheet) | 4.9, NFR-014 | 🔴 | FE1 | S0-02 |
| [ ] | S0-06 | Wireframe & mockup Figma: menu, keranjang, checkout, status, kasir, admin menu | FR-001…008 | 🔴 | FE1 | – |
| [ ] | S0-07 | Finalisasi BRS & SRS draft (`docs/compro/`) + notulen validasi mitra | – | 🔴 | SA, PM | – |
| [ ] | S0-08 | Minta contoh export produk & transaksi Olsera + konfirmasi akses API (simpan bukti) | Lampiran G | 🔴 | PM | – |

## Sprint 1 — Core Order (Minggu 8) → target MVP minggu 9

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S1-01 | Modul `auth`: login, refresh (rotasi), logout, me, lockout 5x, `JwtAuthGuard`, `RolesGuard` | FR-009 | 🔴 | BE | S0-04 |
| [ ] | S1-02 | Modul `tables`: `GET /public/tables/:token`, CRUD meja admin | FR-001, FR-011 | 🔴 | BE | S0-04 |
| [ ] | S1-03 | Modul `menu`: `GET /public/outlets/:slug/menu` (cache Redis 60 s), CRUD kategori & item, toggle availability, arsip | FR-002, FR-010 | 🔴 | BE | S0-04 |
| [ ] | S1-04 | Halaman menu digital `/m/[outlet]/t/[token]`: header meja, tab kategori sticky, kartu menu, label Habis, pencarian | FR-001, FR-002 | 🔴 | FE1 | S1-02, S1-03 |
| [ ] | S1-05 | Keranjang (Zustand + localStorage per token), catatan item, bottom sheet total | FR-003 | 🔴 | FE1 | S1-04 |
| [ ] | S1-06 | Modul `orders`: `POST /public/orders` (idempotency, hitung ulang harga, lock stok, rate limit) metode CASHIER | FR-004, FR-006, NFR-007, NFR-009 | 🔴 | BE | S1-03 |
| [ ] | S1-07 | `order-status.machine.ts` + endpoint `PATCH /orders/:id/status`, `mark-paid`, `cancel` (kembalikan stok) | FR-006, FR-008 | 🔴 | BE | S1-06 |
| [ ] | S1-08 | Gateway Socket.IO `/realtime` (auth handshake JWT, room kasir & order) + event `order.created/updated` | FR-008, NFR-002 | 🔴 | BE | S1-06 |
| [ ] | S1-09 | Halaman checkout (nama, HP opsional, pilih metode) + halaman status pesanan realtime | FR-004, FR-007 | 🔴 | FE1 | S1-06, S1-08 |
| [ ] | S1-10 | Dashboard kasir: login, kolom status, kartu pesanan, suara notifikasi, tandai lunas, batal, banner koneksi | FR-008 | 🔴 | FE2 | S1-07, S1-08 |
| [ ] | S1-11 | Admin: halaman kelola menu (CRUD, toggle) | FR-010 | 🔴 | FE2 | S1-03 |
| [ ] | S1-12 | EDA data transaksi Olsera + PoC FP-Growth di notebook | FR-015 | 🔴 | AI | S0-08 |
| [ ] | S1-13 | Deploy staging (Vercel + Cloud Run + DB) dan demo MVP end-to-end | – | 🔴 | BE | S1-01…S1-11 |
| [ ] | S1-14 | SDD draft + slide progres untuk penilaian minggu 9 | – | 🔴 | SA, PM | – |

## Sprint 2 — Payment & Admin (Minggu 10–11)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S2-01 | Modul `payments`: `POST /public/orders/:code/pay` (Midtrans Snap QRIS, expiry 15 menit) | FR-005 | 🔴 | BE | S1-06 |
| [ ] | S2-02 | Webhook Midtrans: verifikasi signature, idempoten, update status, emit `payment.updated`, kembalikan stok saat expire | FR-005, NFR-008 | 🔴 | BE | S2-01 |
| [ ] | S2-03 | UI pembayaran QRIS (Snap.js) + pilih ulang metode saat gagal | FR-005 | 🔴 | FE1 | S2-01 |
| [ ] | S2-04 | Generate & regenerate token QR, `GET /tables/qr.pdf` berdesain brand | FR-011 | 🔴 | BE | S1-02 |
| [ ] | S2-05 | Admin: halaman meja & cetak QR | FR-011 | 🔴 | FE2 | S2-04 |
| [ ] | S2-06 | Landing page (SSG/ISR): hero, cerita brand, menu read-only, promo, lokasi, WhatsApp, SEO + schema.org Restaurant | FR-012 | 🔴 | FE1 | S1-03 |
| [ ] | S2-07 | `PosSyncAdapter` + `OlseraCsvAdapter`: preview & apply impor produk, pemetaan kolom tersimpan | FR-013 | 🔴 | BE | S0-08, S1-03 |
| [ ] | S2-08 | Ekspor transaksi lunas ke CSV + `pos_sync_logs` + `MockOlseraAdapter` untuk test | FR-013, FR-014 | 🔴 | BE | S2-07 |
| [ ] | S2-09 | Impor riwayat transaksi Olsera (`source = OLSERA_IMPORT`) untuk analitik & AI | FR-013 | 🔴 | BE, AI | S2-07 |
| [ ] | S2-10 | Admin: halaman sinkronisasi (unggah, pemetaan kolom, pratinjau, log, ekspor) | FR-013, FR-014 | 🔴 | FE2 | S2-07, S2-08 |
| [ ] | S2-11 | Upload foto menu ke Cloudinary | FR-010 | 🟡 | BE | S1-03 |
| [ ] | S2-12 | Admin: kelola akun staf | FR-021 | 🟡 | FE2, BE | S1-01 |

## Sprint 3 — Intelligence (Minggu 12–13)

| | ID | Task | Ref | Prio | Peran | Bergantung |
|---|----|------|-----|------|-------|------------|
| [ ] | S3-01 | `apps/reco`: training FP-Growth + popularitas per slot, simpan `recommendation_rules` & `recommendation_models` | FR-015, FR-016, FR-022 | 🔴 | AI | S2-09 |
| [ ] | S3-02 | Evaluasi offline holdout: HitRate@3, Precision@3, coverage vs baseline terlaris | FR-015 | 🔴 | AI | S3-01 |
| [ ] | S3-03 | `GET /internal/recommend` + proxy API `GET /public/recommendations` dengan timeout & fallback | FR-015, NFR-004, NFR-020 | 🔴 | AI, BE | S3-01 |
| [ ] | S3-04 | UI "Populer sekarang" & "Sering dibeli bersama" + pencatatan `recommendation_events` | FR-015, FR-016, FR-019 | 🔴 | FE1 | S3-03 |
| [ ] | S3-05 | Modul `analytics`: summary, sales-trend, top-items, peak-hours, menu-engineering, export | FR-017, FR-018 | 🔴 | AI, BE | S2-09 |
| [ ] | S3-06 | Dashboard analitik admin (Recharts, palet brand, filter tanggal & sumber) | FR-017, FR-018 | 🔴 | FE2 | S3-05 |
| [ ] | S3-07 | Performa rekomendasi (impression, CTR, attach rate) + halaman rule & model | FR-019, FR-022 | 🟡 | AI, FE2 | S3-04 |
| [ ] | S3-08 | Modul & halaman promo, penerapan otomatis saat checkout | FR-020 | 🟡 | BE, FE2 | S1-06 |
| [ ] | S3-09 | Cloud Scheduler retrain harian 03:00 WIB | FR-022 | 🟡 | AI | S3-01 |
| [ ] | S3-10 | Uji coba di outlet Matwona (QR tercetak, data pesanan riil) | – | 🔴 | PM, QA | S2-* |

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
| [ ] | S4-08 | Cetak ringkasan pesanan (print CSS 58/80 mm) | FR-024 | 🟢 | FE2 | S1-10 |

## Rilis

| | ID | Task | Minggu |
|---|----|------|--------|
| [ ] | R-01 | Deploy production (`main`), `min-instances=1`, warm-up | 15 |
| [ ] | R-02 | Final presentation & demo ke Dosen Pendamping | 15 |
| [ ] | R-03 | Exhibition: booth, QR meja contoh, dashboard, poster, video | 16 |

## Parkir (Could / Won't v1)

- FR-023 Adapter API Olsera (aktifkan bila akses didapat)
- FR-025 Panggil pelayan
- Kitchen Display System, multi-outlet, loyalitas (roadmap v2)
