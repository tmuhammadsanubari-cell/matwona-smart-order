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
- Komponen dasar di `src/components/ui` (import dari `@/components/ui`): `Button` (primary/secondary/ghost/danger, `loading`, min. 44 px), `Card` (`muted` untuk item Habis), `Badge` (tone neutral/primary/success/danger/cream), `Input` & `Textarea` (label, hint, error + aria), `BottomSheet` (modal: Escape, klik latar, kunci scroll, fokus terjebak & dikembalikan, `footer` sticky untuk total). Gabung kelas dengan `cx`.
- Pratinjau komponen: `/dev/ui` (hanya `pnpm dev`, 404 di build produksi). Cek di lebar 360 px.
- Cek tampilan otomatis (Playwright/Chromium): `pnpm --filter web ui:check --url http://localhost:3000/<rute> --out <folder> [--click "Nama tombol"] [--key Escape]` → screenshot 360×740 per langkah + laporan overflow horizontal, target sentuh < 44 px, dan error console. Butuh `npx playwright install chromium` sekali. Simpan screenshot di luar repo.
- Uji dari HP sungguhan: HP & laptop di jaringan yang sama (Wi-Fi kos sering memakai client isolation → pakai Mobile hotspot laptop, IP `192.168.137.1`), buka `http://<IP-laptop>:3000/...`. `allowedDevOrigins: ['192.168.*.*']` di `next.config.ts` mengizinkan JS dev dari IP tersebut; tanpa itu halaman tampil tetapi tidak interaktif.
- Test: Vitest + Testing Library (jsdom), file `*.test.ts(x)` di samping komponen. `contrast.test.ts` membaca token dari `globals.css` dan menguji kontras ≥ 4,5:1 (NFR-014) untuk setiap pasangan teks/latar komponen — tambahkan pasangan baru di sana bila memakai kombinasi warna baru.
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
- Tidak boleh hex warna di komponen; gunakan kelas token (`bg-primary`, `text-cream`, `text-muted`, `border-line`, `rounded-card`). `accent`/`success` jangan untuk teks kecil (kontras ±3,5:1); untuk status "berhasil" pakai `Badge tone="success"` (teks primary di `primary-soft`).
- Teks UI bahasa Indonesia, nada santai dan sopan.
- Gambar menu via `next/image` dari `res.cloudinary.com` (sudah diizinkan di `next.config.ts`).
- Target performa halaman menu: LCP ≤ 2,5 detik di 4G (NFR-001). Hindari library berat di rute pelanggan; Recharts hanya di `/admin`.
