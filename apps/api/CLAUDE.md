# CLAUDE.md — apps/api (NestJS)

Baca `CLAUDE.md` root dulu.

## Struktur

```
prisma/schema.prisma        Skema DB (sumber: PRD 4.2). Ubah skema → pnpm db:migrate
prisma.config.ts            Prisma 7: URL DB & perintah seed
prisma/seed.ts              Data lokal (outlet, staf, menu fiktif, 10 meja)
src/generated/prisma/       Client Prisma hasil generate (jangan diedit, di-gitignore)
src/common/                 AppException, AllExceptionsFilter, ZodValidationPipe, decorator @Public/@Roles
src/prisma/                 PrismaService (adapter pg)
src/redis/                  CacheService (JSON cache Redis, gagal = cache miss)
src/modules/<nama>/         Satu modul per domain
test/fixtures/              CSV contoh Olsera (fiktif)
```

## Sudah Ada

- `health.controller.ts` → `GET /health`
- `modules/orders/order-status.machine.ts` + spec (aturan transisi status, jangan diduplikasi)
- `modules/pos-sync/adapters/*` → interface `PosSyncAdapter`, `MockOlseraAdapter`, kerangka `OlseraCsvAdapter`
- Format error global sesuai PRD 4.5
- `modules/auth` → login/refresh/logout/me, guard global `JwtAuthGuard` → `RolesGuard` → `CsrfGuard`. **Semua endpoint wajib login kecuali ditandai `@Public()`**; batasi role dengan `@Roles('ADMIN')`; ambil staf dengan `@CurrentUser()`. Saat menonaktifkan akun (S2-12) panggil `AuthService.revokeAllForUser`.
- `modules/tables` → `GET /public/tables/:token`, CRUD meja admin. Untuk validasi header `X-Table-Token` (S1-06) pakai `TablesService.resolveToken`; token baru dari `generateTableToken()`.
- `modules/menu` → menu publik (cache Redis 60 s), CRUD kategori & item, toggle availability, arsip. **Setiap perubahan yang memengaruhi menu pelanggan (stok dari pesanan di S1-06, sinkron Olsera di S2-07) wajib memanggil `PublicMenuService.invalidate(outletId)`.**
- `modules/orders` → `POST /public/orders` (`OrdersService.create`): hitung ulang harga di `order-pricing.ts`, kode pesanan di `order-code.ts`, kunci stok `FOR UPDATE`, idempotency, rate limit. `StaffOrdersService` → daftar/detail, ubah status, tandai lunas (`assertCanMarkPaid` di state machine), batal + kembalikan stok. Update status memakai `guardedUpdate` (bersyarat status lama) agar aman dari kasir paralel. Expire QRIS (S2-02) wajib mengembalikan stok dengan cara yang sama lalu memanggil `PublicMenuService.invalidate`. DTO dibentuk di `order.mapper.ts`; tanggal WIB di `common/wib.ts`.
- `modules/realtime` → gateway `/realtime` (auth di handshake: cookie staf → room kasir; `tableToken`+`orderCode` → room pesanan). Modul lain memancarkan event lewat `RealtimeService` (`orderCreated/orderUpdated/paymentUpdated`) **setelah** commit. `main.ts` memasang `RedisIoAdapter` (fallback in-memory). Webhook Midtrans (S2-02) wajib memanggil `paymentUpdated`.
- `redis/rate-limit.service.ts` → `RateLimitService.hit(key, limit, windowSec)` (Redis, fallback in-memory). `app.setup.ts` memasang `trust proxy` (`TRUST_PROXY_HOPS`, default 1) agar `req.ip` = IP klien.
- `common/cors.ts` → `isAllowedOrigin`/`corsOrigin` dipakai CORS HTTP & Socket.IO: produksi hanya `WEB_ORIGIN`; di luar produksi juga `http://192.168.*.*:3000` (uji web di HP).
- `common/pipes/zod-validation.pipe.ts` → `uuidParam()` untuk validasi `:id`.
- Skema update parsial di `shared` sengaja tanpa `.default()`: di Zod 4 `.partial()` tetap menerapkan default dan akan menimpa field yang tidak dikirim.

## Belum Ada (lihat docs/BACKLOG.md)

users, payments, promos, analytics, recommendations, controller pos-sync.

## Catatan Teknis

- **ESM (NestJS 12):** paket ini `"type": "module"`. Import relatif wajib `.js` (`./orders.service.js`). Gunakan `import.meta.dirname`, bukan `__dirname`. Struktur mengikuti template resmi `nest new` versi ESM.
- **Test:** Vitest (`pnpm --filter api test`), `globals: true` sehingga `describe/it/expect` tanpa import. E2E: `vitest.config.e2e.ts`, file `test/*.e2e-spec.ts`.
- **Prisma 7:** import client dari `../generated/prisma/client.js` (path relatif), bukan `@prisma/client`. Koneksi lewat `@prisma/adapter-pg`. Client di-generate otomatis saat `pnpm install` (postinstall).
- **Transaksi pesanan:** gunakan `prisma.$transaction` interaktif; kunci stok dengan `SELECT ... FOR UPDATE` via `$queryRaw` atau `updateMany` bersyarat `stock >= qty` lalu cek `count`.
- **Kode pesanan:** `MTW-YYMMDD-XXXX` dengan tanggal WIB; nomor urut per hari.
- **Realtime:** gateway di `modules/realtime`, namespace `/realtime`. Pakai `SocketEvent` dan `socketRoom` dari `shared`.
- **Midtrans:** pakai `midtrans-client` (Snap). Signature webhook diverifikasi manual (PRD 2.2.3).
- **Panggilan ke AI service:** `fetch` dengan `AbortSignal.timeout(RECO_TIMEOUT_MS)`; fallback ke query terlaris saat gagal.
- Setiap query bisnis wajib filter `outletId` (siap multi-outlet, NFR-016).
- Test unit di samping file (`*.spec.ts`); e2e di `test/*.e2e-spec.ts` memakai database test. CI (`.github/workflows/ci.yml`, job `api-e2e`) menjalankan e2e dengan Postgres + Redis sungguhan pada database kosong (`prisma migrate deploy`), jadi e2e wajib membuat datanya sendiri (outlet/staf/meja unik per run) dan tidak boleh bergantung pada seed.
- Catatan Vitest + DI NestJS: Vitest (esbuild) tidak mengeluarkan metadata decorator. Untuk test yang memakai `Test.createTestingModule` dengan injeksi via tipe constructor, gunakan `@Inject(Token)` eksplisit atau tambahkan `unplugin-swc` di `vitest.config.ts`. Unit test murni (service tanpa DI) tidak terpengaruh.
