# CLAUDE.md — apps/web (Next.js)

Baca `CLAUDE.md` root dan `docs/design/BRAND.md` dulu.

## Rute

| Rute | Pengguna | FR / Task |
|------|----------|-----------|
| `/` (`app/(landing)`) | Publik | FR-012 / S2-06 |
| `/m/[outlet]/t/[token]` | Pelanggan (tamu) | FR-001…004 / S1-04, S1-05, S1-09 |
| `/m/[outlet]/order/[code]` | Pelanggan | FR-007 / S1-09 |
| `/login` | Staf | FR-009 / S1-01 |
| `/cashier` | Kasir | FR-008 / S1-10 |
| `/admin/*` | Owner | FR-010, 011, 013, 017–022 |

## Sudah Ada

- Token brand Tailwind v4 di `src/app/globals.css` (`@theme`), font fallback Plus Jakarta Sans di `layout.tsx`
- `src/lib/api.ts`: `apiFetch` (header `X-Table-Token`, `Idempotency-Key`, error `ApiClientError`)
- `src/stores/cart.ts`: keranjang Zustand dipersist per token meja
- Halaman placeholder untuk setiap rute utama

## Konvensi

- Next.js 16 App Router: `params` di page adalah `Promise`, selalu `await params`.
- Server Component default; `'use client'` hanya untuk interaksi (keranjang, socket, form).
- Data fetching klien: TanStack Query. Realtime: `socket.io-client` ke `NEXT_PUBLIC_SOCKET_URL`, event dari `SocketEvent` di `shared`.
- Validasi form memakai skema Zod dari `shared` (mis. `createOrderSchema`).
- Format uang: `formatRupiah` dari `shared`. Label status: `ORDER_STATUS_LABEL`, `PAYMENT_STATUS_LABEL`.
- Mobile-first: desain di 360 px dulu, target sentuh ≥ 44 px, keranjang sebagai bottom sheet.
- Tidak boleh hex warna di komponen; gunakan kelas token (`bg-primary`, `text-cream`, `text-muted`, `border-line`, `rounded-card`).
- Teks UI bahasa Indonesia, nada santai dan sopan.
- Gambar menu via `next/image` dari `res.cloudinary.com` (sudah diizinkan di `next.config.ts`).
- Target performa halaman menu: LCP ≤ 2,5 detik di 4G (NFR-001). Hindari library berat di rute pelanggan; Recharts hanya di `/admin`.
