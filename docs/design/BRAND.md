# Brand & UI — Matwona

Sumber: Brand Guideline Matwona (dari mitra). Token diimplementasikan di `apps/web/src/app/globals.css` (Tailwind v4 `@theme`).

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

Jangan hardcode hex di komponen; selalu pakai kelas token (`bg-primary`, `text-cream`, `border-accent`).

## Tipografi

- **Mosvita** (font utama, heading & body). File font belum tersedia → fallback **Plus Jakarta Sans** (Google Fonts) melalui `next/font`.
- **Anton** hanya untuk logo. Jangan dipakai untuk teks UI.
- Logo: gunakan file SVG resmi dari mitra (`apps/web/public/brand/`), jangan diketik ulang dengan font.

## Fotografi

- Tone natural, terang, menonjolkan tuna segar dan proses di dapur terbuka (tangan, potongan ikan, es).
- Foto menu rasio 4:3, latar netral, diunggah ke Cloudinary dan disajikan `f_auto,q_auto,w_480`.

## Pola UI

- Mobile-first, lebar minimum 360 px, target sentuh ≥ 44 px.
- Satu aksi utama per layar; tombol "Tambah" besar di kartu menu.
- Keranjang sebagai bottom sheet dengan total selalu terlihat.
- Bahasa santai dan sopan: "Pesananmu sudah diterima kasir 🙌", bukan "Order status: CONFIRMED".
