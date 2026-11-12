# Penyesuaian konten mobile Matwona

Tampilan editorial yang sudah ada dipertahankan. UI Design hanya referensi,
bukan pengganti desain web saat ini.

## Sumber konten

- Brand Guideline.pdf: enam halaman, diberikan pemilik proyek pada 11 November 2026.
  Logo, warna #106f4d / #069d70 / #ffffca, dan cerita Ma-Two-Na sudah sesuai.
  Mosvita disebut sebagai font utama; file font tidak disertakan, sehingga fallback
  Plus Jakarta Sans yang ada tetap digunakan.
- Tiga foto menu di WhatsApp Unknown 2026-11-11 at 22.40.24.zip:
  olahan tuna dan alacarte; bakmie dan camilan; kopi, teh, dan minuman.
- Delapan foto produk memakai JPEG asli dari Project Compro-20261111T164642Z-1-001.zip,
  disalin utuh tanpa cropping atau perubahan proporsi. Sepuluh foto produk lainnya
  masih berasal dari materi poster awal. Lembar menu lengkap tersedia pada bagian
  "Lihat foto menu asli Matwona". Empat foto sandwich tidak dipasangkan ke menu lain.

## Katalog acuan

`packages/shared/src/catalog.ts` memuat 46 pilihan:

| Kelompok                 | Jumlah |
| ------------------------ | -----: |
| Olahan Tuna              |      6 |
| Non-Spicy                |      2 |
| Bakmie Series            |      5 |
| Paket Nasi Telur Barendo |      4 |
| Camilan & Dessert        |      3 |
| Alacarte & Tambahan      |     10 |
| Signature Coffee         |      6 |
| Signature Black Tea      |      2 |
| Minuman Segar            |      8 |

Buku menu publik dan seed API menggunakan katalog yang sama. Harga yang berbeda
pada kode lama dikoreksi mengikuti foto menu. Deskripsi singkat menjelaskan jenis
sajian; ketersediaan dan harga transaksi tetap berasal dari API.

Seed melakukan upsert berdasarkan SKU. Tidak menghapus menu lama, pesanan, atau
pemetaan Olsera yang sudah ada. Foto yang tidak tersedia tidak diganti dengan
foto produk lain. Tidak membuat ID produk Olsera fiktif.

## Mobile

- Navigasi bagian halaman dan kategori dapat digeser.
- Pencarian nama, kategori, dan deskripsi dengan keadaan hasil kosong.
- Baris menu berupa tombol yang dapat digunakan lewat keyboard.
- Detail memakai BottomSheet bersama: fokus terjaga, scroll latar terkunci,
  tombol Tutup selalu ada, dan Escape mengembalikan fokus.
- Harga tidak terpotong dan menu cetak dapat dibuka penuh untuk diperbesar.
- Gambar WebP, ukuran responsif, lazy loading selain gambar utama.

## Menjalankan katalog pada menu meja

Setelah migrasi database lokal berhasil:

```powershell
corepack pnpm --filter shared build
corepack pnpm --filter api exec prisma migrate deploy
corepack pnpm --filter api prisma:seed
```

Kegagalan `Schema engine error` pada lingkungan lokal sudah terjadi sebelum
penyesuaian UI ini. Buku menu publik tidak bergantung pada koneksi database.
Seed ini ditujukan untuk pengembangan; periksa data operasional sebelum memakai
seed di lingkungan lain.

## Verifikasi

- Build produksi web berhasil.
- Typecheck web dan API berhasil; lint pada file UI yang diubah berhasil.
- 197 tes web yang tersedia lulus (18 berkas).
- Uji browser Edge headless pada lebar 360, 390, 430, 768, dan 1280 px:
  46 menu tampil, tidak ada overflow horizontal atau error JavaScript.
- Pencarian kopi, hasil kosong, reset, buka/tutup detail dengan dan tanpa foto,
  Escape, penguncian scroll latar, dan foto menu asli berhasil.
- Target sentuh pada halaman publik di tiga lebar HP minimal 44 px.
- Semua 18 foto produk yang dirujuk tersedia.

Login, checkout, dan pembayaran belum diverifikasi ulang karena migrasi database
lokal masih gagal. Tidak ada klaim bahwa alur transaksi sudah siap.

## Penyesuaian foto asli

Delapan aset asli dipasangkan berdasarkan nama menu: enam olahan tuna
(reguler/jumbo untuk matah, dabu-dabu, lada garam) serta bakmie ayam kampung dan
bakmie tuna lada garam. Berkas JPEG asli tidak dipotong atau diregangkan.

Hero makanan, detail buku menu, dan thumbnail poster menggunakan object-contain.
Komponen MenuPhoto menggunakan aturan yang sama untuk kartu menu pelanggan,
detail pesanan, keranjang, dan pratinjau unggahan admin. Ruang kosong mengikuti
perbandingan sisi foto; gambar tidak diperbesar melewati bingkainya.

## Aset tambahan 12 November 2026

Folder Menu Foto dari mitra memuat 18 PNG: 17 cocok dengan menu yang ada dan
Sourdough Tuna Melt belum mempunyai entri/harga di katalog. Tujuh belas foto asli
tersebut dipasang utuh: enam tuna, empat bakmie, lima kopi, dan dua milk tea.
Sembilan di antaranya melengkapi menu yang sebelumnya belum memiliki foto khusus;
delapan lainnya memperbarui aset lama. Kopi Hitam Classic hangat masih memakai
materi poster karena tidak ada foto khususnya pada folder tambahan.

File lokal memakai optimasi bawaan Next Image agar thumbnail mobile tidak
mengunduh PNG asli berukuran besar. Loader khusus tetap dipakai untuk Cloudinary.
Seluruh gambar tetap memakai object-contain, tanpa pemotongan atau peregangan.

Verifikasi tambahan: 17 foto PNG termuat utuh pada lebar 360/390/430 px tanpa
overflow; typecheck, lint komponen foto, dan 22 tes menu/keranjang lulus.
