# Matwona Smart Order

Sistem pemesanan digital berbasis QR meja untuk **Matwona** (tuna & ayam kampung): menu digital, checkout ke kasir, pembayaran QRIS, landing page, sinkronisasi Olsera POS, rekomendasi menu berbasis AI, dan dashboard analitik penjualan.

Proyek Computing Project (CAK4CAC3), S-1 Informatika, Telkom University, 2026.

## Struktur

```
apps/web        Next.js: landing, menu digital, dashboard kasir & admin
apps/api        NestJS: REST API, Socket.IO, Prisma
apps/reco       FastAPI: rekomendasi menu (FP-Growth)
packages/shared Skema Zod & tipe bersama
infra/          docker-compose & Dockerfile
docs/           PRD, backlog, ADR, API, desain, template dokumen ComPro
```

## Prasyarat

- Node.js 22 LTS + pnpm (`corepack enable`)
- Docker (untuk PostgreSQL & Redis)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) (untuk `apps/reco`)

## Menjalankan Lokal

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev                                   # web :3000, api :4000
cd apps/reco && uv sync && uv run fastapi dev app/main.py --port 8000
```

Buka:
- Landing page: http://localhost:3000
- Menu meja contoh: lihat token meja yang dicetak saat `pnpm db:seed`, lalu buka `http://localhost:3000/m/matwona/t/<token>`
- Kasir: http://localhost:3000/cashier
- Admin: http://localhost:3000/admin

## Dokumen

| Dokumen | Path |
|---------|------|
| Product Requirement Document | `docs/PRD.md` |
| Backlog per sprint | `docs/BACKLOG.md` |
| Kontrak API | `docs/API.md` |
| Keputusan arsitektur | `docs/adr/` |
| Brand & UI | `docs/design/BRAND.md` |
| Template BRS / SRS / SDD / UAT | `docs/compro/` |

## Bekerja dengan Claude Code

Repo ini disiapkan untuk Claude Code. Konteks utama ada di `CLAUDE.md` (root dan per app). Perintah slash yang tersedia di `.claude/commands/`:

| Perintah | Fungsi |
|----------|--------|
| `/kerjakan-task <ID>` | Kerjakan satu task dari `docs/BACKLOG.md` sampai Definition of Done |
| `/status-sprint` | Ringkas progres backlog per sprint |
| `/cek-fr <FR-xxx>` | Audit apakah acceptance criteria satu FR sudah terpenuhi & teruji |
| `/modul-baru <nama>` | Scaffold modul NestJS baru sesuai konvensi |
| `/review-pr` | Review perubahan di branch saat ini terhadap aturan di CLAUDE.md |

## Alur Git

- `main` → production (final presentation & exhibition)
- `develop` → staging
- `feature/<FR-xxx>-<deskripsi>` → kerja harian, PR ke `develop`, minimal 1 reviewer
- Commit: Conventional Commits + ID FR, contoh `feat(menu): toggle availability [FR-010]`
