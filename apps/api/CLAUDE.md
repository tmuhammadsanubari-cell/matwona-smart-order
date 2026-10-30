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
src/modules/<nama>/         Satu modul per domain
test/fixtures/              CSV contoh Olsera (fiktif)
```

## Sudah Ada

- `health.controller.ts` → `GET /health`
- `modules/orders/order-status.machine.ts` + spec (aturan transisi status, jangan diduplikasi)
- `modules/pos-sync/adapters/*` → interface `PosSyncAdapter`, `MockOlseraAdapter`, kerangka `OlseraCsvAdapter`
- Format error global sesuai PRD 4.5
- `modules/auth` → login/refresh/logout/me, guard global `JwtAuthGuard` → `RolesGuard` → `CsrfGuard`. **Semua endpoint wajib login kecuali ditandai `@Public()`**; batasi role dengan `@Roles('ADMIN')`; ambil staf dengan `@CurrentUser()`. Saat menonaktifkan akun (S2-12) panggil `AuthService.revokeAllForUser`.

## Belum Ada (lihat docs/BACKLOG.md)

users, tables, menu, orders (service/controller), payments, realtime, promos, analytics, recommendations, controller pos-sync.

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
- Test unit di samping file (`*.spec.ts`); e2e di `test/*.e2e-spec.ts` memakai database test.
- Catatan Vitest + DI NestJS: Vitest (esbuild) tidak mengeluarkan metadata decorator. Untuk test yang memakai `Test.createTestingModule` dengan injeksi via tipe constructor, gunakan `@Inject(Token)` eksplisit atau tambahkan `unplugin-swc` di `vitest.config.ts`. Unit test murni (service tanpa DI) tidak terpengaruh.
