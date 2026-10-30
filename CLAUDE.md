# CLAUDE.md — Matwona Smart Order

Panduan untuk Claude Code saat bekerja di repo ini. Baca file ini dulu, lalu `CLAUDE.md` di folder app yang sedang dikerjakan.

## Konteks Proyek

- **Apa:** sistem pemesanan digital berbasis QR meja untuk **Matwona**, rumah makan spesialis tuna & ayam kampung (1 outlet, Bandung).
- **Untuk apa:** capstone mata kuliah CAK4CAC3 Computing Project, S-1 Informatika Telkom University. Tim 7 orang.
- **Sumber kebenaran:** `docs/PRD.md`. Setiap fitur punya ID `FR-xxx`, setiap kebutuhan non-fungsional `NFR-xxx`. Rujuk ID ini di commit, PR, dan test.
- **Backlog & urutan kerja:** `docs/BACKLOG.md`.
- **Keputusan arsitektur:** `docs/adr/`.
- Bahasa: kode, nama variabel, dan komentar teknis dalam **bahasa Inggris**. Teks UI, pesan error ke pengguna, dan dokumen dalam **bahasa Indonesia**.

## Arsitektur Singkat

Monorepo pnpm workspaces:

| Path | Isi | Stack |
|------|-----|-------|
| `apps/web` | Landing page, menu digital pelanggan (`/m/[outlet]/t/[token]`), dashboard kasir (`/cashier`), dashboard admin (`/admin`) | Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack Query, Zustand |
| `apps/api` | REST API + Socket.IO gateway (`/realtime`) | NestJS 12 (**ESM**), Prisma 7 + PostgreSQL, Redis, Vitest |
| `apps/reco` | AI service rekomendasi menu (FP-Growth + popularitas per slot waktu) | Python 3.12, FastAPI, pandas, mlxtend |
| `packages/shared` | Skema Zod, tipe, kode error, enum bersama web ↔ api | TypeScript |
| `infra/` | docker-compose lokal, Dockerfile | – |

Alur utama: pelanggan scan QR → `GET /api/public/tables/:token` → menu → `POST /api/public/orders` → event `order.created` ke kasir → bayar QRIS (Midtrans webhook) atau "bayar di kasir" → kasir ubah status.

## Perintah

```bash
pnpm install                     # install semua workspace
pnpm infra:up                    # start postgres + redis (docker compose)
pnpm db:migrate                  # prisma migrate dev (apps/api)
pnpm db:seed                     # seed outlet Matwona, admin, kasir, menu contoh, meja
pnpm dev                         # web (3000) + api (4000) paralel
pnpm --filter reco dev           # AI service (8000), butuh: cd apps/reco && uv sync
pnpm lint && pnpm typecheck && pnpm test   # wajib lulus sebelum commit
```

Akun seed: `admin@matwona.local` / `Admin123!` (ADMIN), `kasir@matwona.local` / `Kasir123!` (CASHIER). Hanya untuk lokal.

## Aturan Bisnis yang Tidak Boleh Dilanggar

1. **Harga dihitung ulang di server.** Abaikan harga dari klien. Total = Σ(qty × harga DB − diskon promo). (NFR-007)
2. **Uang = integer Rupiah.** Jangan pakai float/decimal untuk nominal.
3. **State machine pesanan** (`apps/api/src/modules/orders/order-status.machine.ts`) adalah satu-satunya tempat aturan transisi status. QRIS harus `PAID` sebelum `CONFIRMED`.
4. **Webhook Midtrans:** verifikasi `signature_key = SHA512(order_id + status_code + gross_amount + SERVER_KEY)` dan idempoten.
5. **Pembuatan pesanan idempoten** via header `Idempotency-Key`; stok dikurangi dalam transaksi DB yang sama.
6. **Item menu tidak pernah dihapus permanen** jika pernah dipesan, cukup `isArchived = true`.
7. **Olsera = sumber kebenaran master data** (nama, harga, stok); Smart Order = sumber kebenaran pesanan digital. Semua akses ke Olsera lewat interface `PosSyncAdapter`. API Olsera **belum tersedia**, jadi adapter aktif adalah `olsera-csv`. Jangan menulis kode yang memanggil Olsera di luar folder `adapters/`.
8. **AI service boleh mati.** Jika `reco` timeout (> 300 ms) atau error, API mengembalikan fallback "menu terlaris". (NFR-020)
9. **Pelanggan tidak login.** Akses pelanggan berbasis `X-Table-Token`. Jangan menambah fitur akun pelanggan (di luar scope).
10. Tidak ada role Dapur / Kitchen Display di v1 (di luar scope).

## Konvensi Kode

- TypeScript 6 `strict`. Tidak boleh `any` tanpa komentar alasan.
- `apps/api` dan `packages/shared` adalah **ESM** (`"type": "module"`, `module: nodenext`): import relatif wajib berakhiran `.js` (mis. `import { X } from './x.service.js'`). NestJS 12 tidak lagi mendukung CommonJS.
- Validasi input di API memakai skema Zod dari `packages/shared` (pipe `ZodValidationPipe`). Web memakai skema yang sama untuk form.
- Format response sukses `{ success: true, data }`; error `{ success: false, error: { code, message, details?, traceId } }`. Kode error ada di `packages/shared/src/error-codes.ts`. Tambah kode baru di sana, jangan string bebas.
- Database: tabel `snake_case` jamak (`@@map`), field Prisma `camelCase` (`@map`), PK UUID, waktu `timestamptz` UTC, tampilan WIB.
- Satu modul NestJS = satu folder di `apps/api/src/modules/<nama>` berisi `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.spec.ts`.
- Komponen React: Server Component secara default; tambahkan `'use client'` hanya bila perlu state/event.
- Warna & font hanya lewat token brand di `apps/web/src/app/globals.css` (`bg-primary`, `text-cream`, dst.). Jangan hardcode hex di komponen. Lihat `docs/design/BRAND.md`.

## Alur Kerja yang Diharapkan dari Claude Code

1. Sebelum mengerjakan fitur, baca bagian PRD untuk FR terkait (user story + acceptance criteria) dan task di `docs/BACKLOG.md`.
2. Rencanakan singkat, lalu kerjakan modul demi modul. Tulis test untuk setiap acceptance criteria yang bisa diuji otomatis.
3. Jalankan `pnpm lint && pnpm typecheck && pnpm test` (dan `uv run pytest` untuk `apps/reco`) sebelum menyatakan selesai.
4. Centang task di `docs/BACKLOG.md` dan perbarui PRD/ADR jika ada keputusan yang berubah.
5. Commit dengan Conventional Commits + ID: `feat(orders): create guest order with idempotency [FR-004]`.
6. Jangan commit file `.env`, secret, atau data transaksi asli mitra (folder `data/` di-gitignore).

## Definition of Done

- Acceptance criteria FR terkait terpenuhi dan ada test-nya.
- Lint, typecheck, test lulus.
- Endpoint baru tercatat di `docs/API.md`.
- Teks UI bahasa Indonesia, mobile-first (cek di lebar 360 px).
- Task di backlog dicentang.

## Hal yang Masih Terbuka (cek `docs/PRD.md` Lampiran G)

- Format kolom CSV export Olsera belum diketahui → parser memakai pemetaan kolom yang bisa dikonfigurasi (`pos_column_mappings`). Contoh file sementara: `apps/api/test/fixtures/olsera-products.sample.csv` (fiktif).
- Jumlah meja belum pasti → meja dikelola dinamis.
- Midtrans masih sandbox.
- Font Mosvita belum tersedia → fallback Plus Jakarta Sans.
