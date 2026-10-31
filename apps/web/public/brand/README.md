# Aset Brand

File resmi dari mitra:

- `matwona-logo.png` — logo terang (cream) untuk latar hijau, 710 × 168 px
- `matwona-logo-green.png` — logo hijau untuk latar terang, 710 × 168 px

Keduanya diambil dari kanvas desain Claude Design (lihat `docs/design/BRAND.md`) dan dipakai lewat komponen `<Logo />` (`src/components/ui/logo.tsx`). Bila mitra memberikan versi SVG, simpan sebagai `matwona-logo.svg` / `matwona-logo-green.svg` lalu perbarui `SRC` di komponen tersebut.

Belum tersedia:

- `icon-192.png`, `icon-512.png` — ikon PWA (lalu isi `icons` di `public/manifest.webmanifest`)
- Font Mosvita (jika lisensi tersedia) → pindahkan ke `src/fonts/` dan pakai `next/font/local` di `layout.tsx`

Jangan membuat ulang logo dengan font Anton; selalu pakai file resmi.
