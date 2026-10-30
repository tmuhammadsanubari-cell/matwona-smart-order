---
description: Scaffold modul NestJS baru di apps/api sesuai konvensi proyek
argument-hint: <nama-modul, kebab-case>
---

Buat modul NestJS **$ARGUMENTS** di `apps/api/src/modules/$ARGUMENTS/`:

- `$ARGUMENTS.module.ts`, `$ARGUMENTS.controller.ts`, `$ARGUMENTS.service.ts`, `$ARGUMENTS.service.spec.ts`.
- Daftarkan modul di `apps/api/src/app.module.ts`.
- Input divalidasi dengan skema Zod dari `packages/shared` melalui `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`). Jika skemanya belum ada, buat di `packages/shared/src/schemas/`.
- Endpoint staf dilindungi `JwtAuthGuard` + `@Roles(...)`. Endpoint publik diberi `@Public()`.
- Error dilempar sebagai `AppException(ErrorCode.X, message)`; jangan `HttpException` dengan string bebas.
- Akses DB lewat `PrismaService`; pastikan setiap query bisnis difilter `outletId`.
- Tambahkan entri endpoint ke `docs/API.md`.

Cocokkan nama endpoint dan tabel dengan `docs/PRD.md` bagian 4.2–4.3 sebelum menulis kode.
