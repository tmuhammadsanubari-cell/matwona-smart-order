# ADR 0001 — Monorepo pnpm dengan Next.js, NestJS, dan FastAPI

- **Status:** Diterima
- **Tanggal:** 30 Oktober 2026

## Konteks

Tim 7 orang dengan waktu efektif ±9 minggu harus membangun landing page, menu digital, dashboard kasir & admin, API dengan realtime, integrasi pembayaran & POS, dan layanan AI. Penilaian ComPro mensyaratkan justifikasi teknologi (komponen "Proposed Solution/Technology").

## Keputusan

- Satu monorepo pnpm workspaces: `apps/web`, `apps/api`, `apps/reco`, `packages/shared`.
- Web dan API memakai TypeScript agar anggota FE dan BE bisa saling bantu, dan skema validasi (Zod) dipakai bersama lewat `packages/shared`.
- Layanan AI dipisah dalam Python (FastAPI) karena pustaka data mining (pandas, mlxtend) paling matang di Python.
- PostgreSQL sebagai database tunggal yang dibaca API dan AI service; Redis untuk cache, rate limit, dan adapter Socket.IO.

## Alternatif yang Dipertimbangkan

- **Laravel + Blade:** cepat untuk CRUD, tetapi realtime dan SPA kasir lebih rumit, dan bahasa berbeda dari layanan AI maupun frontend modern.
- **Semua di Next.js (API routes):** lebih sedikit layanan, tetapi WebSocket persisten tidak cocok di Vercel serverless dan modul bisnis kurang terstruktur untuk SDD.
- **Rekomendasi di Node.js:** menghindari layanan tambahan, tetapi implementasi FP-Growth & evaluasi harus ditulis sendiri.

## Konsekuensi

- (+) Satu repo, satu CI, tipe bersama, PR lintas app mudah direview.
- (+) Pemisahan AI service memenuhi NFR-020 (AI boleh mati tanpa mengganggu pemesanan).
- (−) Dua runtime (Node & Python) di CI dan deployment.
- (−) Anggota perlu familiar pnpm workspaces.
