# Analisis Gap: Diskusi Mitra 24 November 2026 vs Sistem Saat Ini

- **Sumber:** transkrip diskusi mitra 24 Nov 2026 (audio 33 menit 53 detik, 4 pembicara). Transkrip lengkap tidak disimpan di repo karena repo public; minta ke PM bila perlu.
- **Dibandingkan dengan:** branch `main` per commit `fc6dbba` (26 Nov 2026, "owner operational features")
- **Tanggal analisis:** 28 November 2026
- **Catatan:** test belum dijalankan saat analisis ini dibuat (dependency belum ter-install). Status "Sudah" berarti kodenya ada, belum berarti sudah lulus uji di outlet.

## Ringkasan

Sebagian besar masukan mitra sudah diimplementasikan di commit `fc6dbba`. Tiga hal besar belum selesai:

1. Cetak ke printer LAN tidak akan jalan setelah API di-deploy ke cloud (Cloud Run).
2. Struk belum tercetak otomatis setiap ada pesanan masuk.
3. Pesanan belum dikirim ke Olsera.

Selain itu, dokumen proyek (PRD, BACKLOG, `API.md`, CLAUDE.md) belum diperbarui sejak diskusi.

Target selesai yang disebut di diskusi: **7 atau 14 Desember 2026**. Tim berencana kembali ke outlet sebelum tanggal itu untuk menguji fitur cetak.

## Poin diskusi dibandingkan sistem

Status: ✅ sudah · ⚠️ sebagian / berisiko · ❌ belum

| # | Masukan mitra (menit) | Status | Kondisi di kode |
|---|---|---|---|
| 1 | QRIS dimatikan untuk Matwona karena layanan self pick-up: pelanggan bayar di kasir untuk ambil pager (07:59, 11:59). Fitur QRIS tetap dibuat lengkap dan bisa diaktifkan lagi (25:12) | ✅ | Toggle `qrisEnabled` dan `serviceMode` ada. Server menolak pesanan QRIS kalau dimatikan (`orders.service.ts`, `payments.service.ts`). Seed sudah `false`, tapi default di `schema.prisma` masih `true` |
| 2 | Bayar dulu di kasir, baru pesanan diproses | ⚠️ | `order-status.machine.ts` masih membolehkan pesanan bayar-di-kasir yang belum lunas masuk CONFIRMED lalu PREPARING. Nomor pager belum dicatat di pesanan |
| 3 | Printer dipisah per station: makanan ke dapur, minuman ke bar (09:02–09:36, 27:35) | ✅ | Kategori punya `printerStation`. Ada `buildSplitTickets` dan encoder ESC/POS untuk LAN port 9100 (`print.service.ts`) |
| 4 | Tiap pesanan langsung keluar struknya (05:49) | ❌ | Cetak masih manual lewat tombol per kartu pesanan di dashboard kasir |
| 5 | Printer dapur pakai LAN dengan IP address (merek "Silicon"), printer depan pakai Bluetooth (26:31–29:45) | ⚠️ | Lihat temuan A dan B |
| 6 | Integrasi Olsera: Olsera ternyata menyediakan API key dan secret key (07:00, 23:03) | ⚠️ | Baru ada konsol uji read-only (`/admin/olsera-test`). Adapter `olsera-api` belum ada, pesanan belum dikirim ke Olsera. **Update 28 Nov:** API sudah dicoba tapi pemanggilan masih gagal karena akses menunggu persetujuan dari pihak Olsera |
| 7 | Menu diringkas: satu kartu Tuna Reguler/Jumbo, varian sambal (dabu-dabu, matah, lada garam) dipilih di pop-up, keterangan seperti "(pedas level 2)" (16:50–20:38) | ✅ | `menu-groups.ts` dan `menu-variant-sheet.tsx`. Varian baru satu dimensi, dan impor CSV Olsera belum membaca kolom varian |
| 8 | Tombol kategori pop-up supaya pelanggan tidak scroll bolak-balik (21:39, 23:11) | ✅ | Bottom sheet kategori di `menu-view.tsx` |
| 9 | Pengingat cek stok berkala ke kasir, misalnya jam 18.00 setelah ramai siang (13:55–14:23) | ⚠️ | Pengingat hanya berupa banner dan hanya muncul kalau dashboard kasir sedang terbuka. Belum ada pengingat terjadwal dari server ke WhatsApp/Telegram |
| 10 | Notifikasi transaksi ke owner lewat Telegram/WhatsApp, termasuk catatan pesanan (15:25) | ⚠️ | Telegram sudah jalan. WhatsApp baru berupa URL webhook generik, belum tersambung ke penyedia WA |
| 11 | Kuota promo, misalnya promo hanya untuk 1.000 porsi (06:49) | ✅ | `maxQuantity`/`usedQuantity`. Kuota dikembalikan saat pesanan batal atau kedaluwarsa |
| 12 | Absensi staf pakai PIN, rekap beberapa hari (07:21, 24:04). Mitra menyebut ini tidak terlalu penting karena sudah punya sistem sendiri (30:07) | ✅ | Modul `attendance` dengan rekap rentang tanggal. Percobaan PIN belum dibatasi |
| 13 | Jam ramai / rekomendasi berdasarkan jam ramai (00:41) | ⚠️ | Grafik `peakHours` dan rekomendasi populer per slot waktu (`POPULAR_SLOT`) sudah ada. Belum ada saran untuk owner, misalnya kapan menyiapkan stok atau menambah staf |
| 14 | Analitik dan AI butuh data yang banyak supaya grafiknya bermakna (24:36) | ⚠️ | S1-12, S3-01, dan S3-02 belum dikerjakan. Data transaksi asli dari Olsera belum diterima |
| 15 | Perhitungan HPP dan margin (33:16) | ❌ | Tidak ada field HPP di skema. Mitra menyampaikan ini sebagai masukan "untuk jualan", jadi opsional untuk capstone |

## Temuan penting

### A. Cetak LAN tidak akan jalan setelah deploy

`sendToLanPrinter` di `print.service.ts` membuka koneksi TCP dari server API ke alamat lokal seperti `192.168.1.200`. PRD menargetkan API berjalan di Google Cloud Run, dan server cloud tidak bisa menjangkau jaringan lokal outlet. Cara ini hanya jalan kalau API berjalan di laptop yang berada di jaringan outlet.

Pilihan solusi:

- **Agen cetak lokal:** program kecil di tablet atau laptop kasir yang menerima tiket lewat Socket.IO lalu meneruskannya ke IP printer.
- **Lewat Olsera:** kirim pesanan ke Olsera dan biarkan Olsera mencetak ke printer yang sudah diatur (lihat temuan C).

### B. Opsi "Bluetooth" sebenarnya sama dengan cetak biasa dari browser

Untuk tipe `BLUETOOTH` dan `BROWSER`, kode hanya memanggil `window.print()` (`thermal-receipt.tsx`). Di tablet Android, ini biasanya butuh aplikasi perantara (misalnya RawBT) atau driver printer. Perlu diuji di perangkat asli saat kunjungan berikutnya.

### C. Integrasi Olsera adalah keputusan terbesar

Di menit 27:35 terlihat Olsera di outlet sudah mengatur printer per grup produk ("send to kitchen kepisah langsung"). Kalau Olsera Open API bisa membuat open order, pesanan dari QR cukup dikirim ke Olsera. Hasilnya:

- Pemisahan struk ke dapur dan bar ditangani Olsera, sehingga masalah A tidak perlu diselesaikan sendiri.
- Kasir tidak perlu menginput ulang pesanan secara manual. Di diskusi, mitra sempat mengusulkan dua perangkat (laptop untuk Olsera, tablet untuk pesanan QR) sebagai solusi sementara (05:31).
- Riwayat transaksi bisa ditarik lewat endpoint `order/closeorder`, sehingga masalah data AI (poin 14) ikut terselesaikan.

**Status per 28 November 2026:** API key dan secret key sudah didapat dan sudah dicoba, tapi pemanggilan API belum berhasil karena akses masih menunggu persetujuan (approval) dari pihak Olsera. Selama approval belum keluar, adapter aktif tetap `olsera-csv`, dan jalur cetak tidak boleh bergantung pada Olsera.

Yang perlu dipastikan setelah approval keluar:

- Apakah Olsera Open API menyediakan endpoint untuk **menulis/membuat** pesanan. Konsol uji sekarang baru memakai endpoint baca.
- Pemanggilan Olsera dari konsol uji ada di `pos-sync/olsera-test.service.ts`, di luar folder `adapters/`. Ini melanggar aturan 7 CLAUDE.md. Kode integrasi yang baru harus masuk ke `OlseraApiAdapter` (FR-023).

### D. Dokumen belum diperbarui

- CLAUDE.md aturan 7 masih menulis "API Olsera belum tersedia".
- PRD masih menjadikan QRIS sebagai alur utama, padahal Matwona memakai bayar di kasir.
- Fitur baru (printer per station, absensi, notifikasi, pengingat stok, mode layanan) belum punya ID FR, task backlog, atau entri di `docs/API.md`.
- Tidak ada entri revisi PRD setelah 30 Oktober 2026.
- Lampiran G PRD nomor 3 (akses API Olsera) dan nomor 7 (perangkat kasir) sebenarnya sudah terjawab di diskusi ini.

## Prioritas yang disarankan (target 7/14 Desember)

1. **Olsera (PM):** tindak lanjuti approval ke pihak Olsera dan simpan buktinya. Saat menunggu, tanyakan juga apakah Open API mendukung pembuatan pesanan (open order).
2. **Jalur cetak tanpa Olsera:** karena approval belum pasti keluar sebelum 7 Desember, buat agen cetak lokal di perangkat kasir dan cetak otomatis tiket dapur/bar saat pesanan ditandai lunas. Uji di outlet sebelum 7 Desember. Kirim pesanan ke Olsera (`OlseraApiAdapter.pushOrder`) jadi tahap berikutnya setelah approval keluar.
3. **Aturan self pick-up:** pesanan harus lunas sebelum CONFIRMED, dengan input nomor pager opsional saat kasir menandai lunas. Aturannya ditaruh di `order-status.machine.ts`.
4. **Pengingat stok dari server** sesuai `stockReminderHours`, dikirim ke Telegram/WhatsApp.
5. **Perbarui dokumen:** PRD revisi 1.2, FR baru, backlog, `API.md`, dan CLAUDE.md aturan 7. Ini sekaligus menjadi bukti validasi mitra untuk S0-07.
6. **Opsional:** batas percobaan PIN absensi, varian dari CSV Olsera, HPP dan margin di analitik menu engineering.

## Masukan bisnis (di luar scope v1)

Mitra juga membagikan pengalaman sebagai konsultan, yang relevan kalau aplikasi ini mau dijual ke outlet lain:

- Outlet dengan runner/waiter atau coffee shop wajib menyediakan QRIS. Matwona berbeda karena self pick-up.
- Model bisnis pembanding: kontrak setahun tanpa biaya langganan, potongan sekitar 0,2% per transaksi.
- Kelemahan aplikasi pembanding yang pernah dipakai mitra: hanya bisa mencetak di kasir (tidak bisa per station) dan tidak ada pengingat stok, sehingga pelanggan sering memesan menu yang sudah habis saat jam ramai.
- Tampilan POS populer dinilai kurang menarik untuk owner muda. Desain Smart Order dinilai bagus.
