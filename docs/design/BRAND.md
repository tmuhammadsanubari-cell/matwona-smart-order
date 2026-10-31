# Brand & UI — Matwona

Sumber: Brand Guideline Matwona (dari mitra). Token diimplementasikan di `apps/web/src/app/globals.css` (Tailwind v4 `@theme`).

**Desain UI (mockup):** kanvas Claude Design "Matwona Smart Order" — <https://claude.ai/artifact/CoYGGv9xvVP3JGyQ9maA4G> (akses lewat akun tim). Halaman kanvas: *Design System* (artboard `Main`), *Menu Digital Pelanggan* (C1–C7), *Landing Page* (L1–L2), *Staf & Kasir* (K1–K3), *Admin / Owner* (A1–A7). Artboard `Main` adalah acuan token & komponen di bawah; katalog komponen yang sudah diimplementasikan bisa dilihat di `/dev/ui` (mode dev).

## Identitas

- **Nama:** Ma-Two-Na. "Ma" = makan, "Two" = dua dunia (tuna & ayam kampung, laut & darat), "Twona" = spesialis tuna.
- **Tagline:** "Two worlds. One table. Simply, makan." / "Protein Terpenuhi, Dengan Tuna Setiap Hari."
- **Karakter:** hangat, personal, akrab seperti warung pinggir jalan dan papan menu lukis tangan. Tidak mewah, tidak korporat. Tuna sebagai makanan sehari-hari, bukan hidangan premium.

## Warna

| Token Tailwind | Hex | Nama brand | Pemakaian |
|----------------|-----|-----------|-----------|
| `primary` | `#106f4d` | sea green | Tombol utama, header, link, teks di atas cream. Kontras putih ±6,2:1 ✅ |
| `accent` | `#069d70` | teal old green | Aksen, badge, ikon, latar section besar. Kontras putih ±3,5:1 → hanya untuk teks besar (≥ 24 px atau bold ≥ 18,7 px) |
| `cream` | `#ffffca` | soft shade of yellow | Latar kartu/section, teks di atas `primary` (±6:1 ✅) |
| `ink` | `#1f2a24` | – | Teks body di latar terang |
| `danger` | `#c0392b` | – | Error, label Habis |
| `muted` | `#5b6b62` | – | Teks sekunder, nama/harga item Habis (di putih ±5,6:1 ✅) |
| `line` / `line-strong` | `#e3e8d9` / `#d5dccb` | – | Border kartu & divider / border input & stepper |
| `primary-hover` | `#0b5a3e` | – | Hover/active tombol primary (teks putih ±8,3:1 ✅); teks badge Lunas |
| `primary-soft` | `#e1f2ea` | – | Banner lembut ("Ada pesanan aktif") & hover tombol sekunder; teks `primary` ±5,3:1 ✅ |
| `success` | `#069d70` | = accent | Ikon/garis status berhasil. **Bukan** untuk teks kecil (±3,5:1) |
| `disabled` | `#dde3d7` | – | Latar tombol/input nonaktif (mis. tombol "Habis"); teksnya `neutral` (±6,2:1 ✅) |

**Warna badge status** (teks di atas latar `-soft`, semua ≥ 5,8:1 ✅). Pemetaan status → tone ada di `apps/web/src/lib/status-tone.ts`.

| Tone Badge | Token (teks / latar) | Dipakai untuk |
|------------|----------------------|---------------|
| `success` | `primary-hover` / `success-soft` `#ddf3e9` | Lunas |
| `warning` | `warning` `#7a4a00` / `warning-soft` `#fff0d1` | Belum bayar (juga `ConnectionBanner`, dibalik) |
| `neutral` | `neutral` `#46534b` / `neutral-soft` `#eceee8` | Menunggu pembayaran, Selesai |
| `info` | `info` `#1d4f7a` / `info-soft` `#e2eef9` | Diterima kasir, Sedang disiapkan |
| `primary` | putih / `primary` | Disajikan |
| `danger` | `danger-strong` `#a12d22` / `danger-soft` `#fbe3e0` | Dibatalkan, Gagal, Kedaluwarsa |
| `danger-solid` | putih / `danger` | Baru (kasir), Habis |

**Penyimpangan dari desain (disengaja):** teks tombol nonaktif `#8a968f` dan nama/harga item Habis `#7a857f`/`#8a948e` di desain hanya ±2,4–3,8:1, jadi diganti `neutral` dan `muted` agar lolos NFR-014. Placeholder foto (`photo-tuna`, `photo-chicken`, `photo-drink`, `photo-none`) hanya berisi ikon dekoratif tanpa teks.

**Bentuk & elevasi:** kartu radius 16 px (`rounded-card`), tombol/input/stepper 12 px (`rounded-control`), bottom sheet 20 px (`rounded-t-sheet`), chip & tab kategori pil. Kartu rata dengan border; bayangan (`shadow-card`, `shadow-float`) hanya untuk elemen melayang.

Jangan hardcode hex di komponen; selalu pakai kelas token (`bg-primary`, `text-cream`, `border-accent`).

Setiap pasangan teks/latar yang dipakai komponen diuji otomatis (≥ 4,5:1, NFR-014) di `apps/web/src/components/ui/contrast.test.ts`.

## Tipografi

- **Mosvita** (font utama, heading & body). File font belum tersedia → fallback **Plus Jakarta Sans** (Google Fonts) melalui `next/font`.
- **Anton** hanya untuk logo. Jangan dipakai untuk teks UI.
- Skala (desain): Display 36 (`text-display`), H1 28 (`text-h1`), H2 22 (`text-h2`), H3 18 (`text-lg`), Body 16, Small 14, Caption 12; heading `font-extrabold`/`font-bold`.
- Logo: pakai komponen `<Logo variant="light|green" />` yang membaca file resmi di `apps/web/public/brand/`, jangan diketik ulang dengan font.

## Fotografi

- Tone natural, terang, menonjolkan tuna segar dan proses di dapur terbuka (tangan, potongan ikan, es).
- Foto menu rasio 4:3, latar netral, diunggah ke Cloudinary dan disajikan `f_auto,q_auto,w_480`.

## Pola UI

- Mobile-first, lebar minimum 360 px, target sentuh ≥ 44 px.
- Satu aksi utama per layar; tombol "Tambah" besar di kartu menu.
- Keranjang sebagai bottom sheet dengan total selalu terlihat.
- Bahasa santai dan sopan: "Pesananmu sudah diterima kasir 🙌", bukan "Order status: CONFIRMED".
