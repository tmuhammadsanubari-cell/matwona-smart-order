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
- Cek tampilan otomatis (Playwright/Chromium): `pnpm --filter web ui:check --url http://localhost:3000/<rute> --out <folder> [--click "Nama tombol"] [--fill "Label=nilai"] [--key Escape]` → screenshot 360×740 per langkah + laporan overflow horizontal, target sentuh < 44 px, dan error console. Butuh `npx playwright install chromium` sekali. Simpan screenshot di luar repo.
- Uji dari HP sungguhan: HP & laptop di jaringan yang sama (Wi-Fi kos sering memakai client isolation → pakai Mobile hotspot laptop, IP `192.168.137.1`), buka `http://<IP-laptop>:3000/...`. `allowedDevOrigins: ['192.168.*.*']` di `next.config.ts` mengizinkan JS dev dari IP tersebut; tanpa itu halaman tampil tetapi tidak interaktif.
- Test: Vitest + Testing Library (jsdom), file `*.test.ts(x)` di samping komponen. `contrast.test.ts` membaca token dari `globals.css` dan menguji kontras ≥ 4,5:1 (NFR-014) untuk setiap pasangan teks/latar komponen — tambahkan pasangan baru di sana bila memakai kombinasi warna baru.
- `src/lib/api.ts`: `apiFetch` (header `X-Table-Token`, `Idempotency-Key`, error `ApiClientError`)
- `src/stores/cart.ts`: keranjang Zustand dipersist per token meja. `skipHydration: true` → panggil `loadCartForTable(token)` setelah mount (sudah dilakukan `MenuView`) agar tidak ada hydration mismatch.
- Menu meja `/m/[outlet]/t/[token]` (S1-04): data diambil di server lewat `load-table-menu.ts` (no-store, paralel); token tidak valid → `InvalidQr`, slug salah → redirect; `loading.tsx` skeleton & `error.tsx`. UI di `src/components/menu` (`MenuView`, `CategoryTabs`, `MenuItemCard` dengan stepper ke keranjang). Pencarian `filterMenu` di `src/lib/menu.ts`; foto via `cloudinaryLoader`.
- Keranjang (S1-05) di `src/components/cart`: `CartBar` (fixed bawah, jumlah item + total) dan `CartSheet` (BottomSheet: baris + `QuantityStepper` 1–20, catatan ≤ 120 karakter, subtotal/diskon/total, tombol ke `/m/[outlet]/t/[token]/checkout`). `summarizeCart(lines, menuItems)` mengeluarkan item habis dari total dan menahan checkout; `syncWithMenu` menyamakan nama & harga dengan menu terbaru saat halaman dibuka. Link yang tampil sebagai tombol: `buttonClassName()`.
- Checkout `/m/[outlet]/t/[token]/checkout` (S1-09): `CheckoutView` validasi nama/HP dengan `createOrderSchema.pick(...)`, `placeOrder` (`src/lib/place-order.ts`) dengan satu `Idempotency-Key` per halaman (`uuidV4`, aman di HTTP non-secure), `DUPLICATE_REQUEST` = sukses, `ITEM_UNAVAILABLE` → item dihapus, `PRICE_CHANGED` → harga diperbarui. QRIS tampil nonaktif sampai S2-03. Sukses → `rememberOrder` + kosongkan keranjang → status.
- Status `/m/[outlet]/order/[code]` (S1-09): `OrderStatusView` membaca token meja dari `src/lib/placed-orders.ts` (localStorage, via `useSyncExternalStore`), TanStack Query + `connectRealtime` (`src/lib/socket.ts`); event memperbarui cache, polling 10 dtk saat socket putus. Progres di `src/lib/order-progress.ts`. Menu menampilkan banner "Lihat pesanan aktif".
- `Providers` (TanStack Query) di `src/app/providers.tsx`, dipasang di root layout.
- Uji di HP tanpa ubah `.env`: `resolveDevUrl` (`src/lib/dev-url.ts`) mengganti host localhost di URL API/socket dengan host halaman saat `next dev`; pasangannya CORS LAN di `apps/api/src/common/cors.ts`.
- Halaman placeholder untuk rute lain (status pesanan, kasir, admin, landing)

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
