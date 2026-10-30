---
description: Review perubahan branch saat ini terhadap aturan proyek
---

Review perubahan di branch ini dibanding `develop` (`git diff develop...HEAD`).

Periksa terutama:
1. Pelanggaran "Aturan Bisnis yang Tidak Boleh Dilanggar" di `CLAUDE.md` (harga dari klien, float untuk uang, transisi status di luar state machine, panggilan Olsera di luar `adapters/`, webhook tanpa verifikasi signature, dsb.).
2. Keamanan: endpoint staf tanpa guard, query tanpa filter `outletId`, secret di kode, data pelanggan bocor ke log.
3. Test: acceptance criteria yang disentuh tapi tidak diuji.
4. Konsistensi: kode error dari `packages/shared`, response format, teks UI bahasa Indonesia, token warna brand (tanpa hex hardcode).
5. Dokumentasi: `docs/API.md` dan `docs/BACKLOG.md` diperbarui.

Laporkan temuan berurutan dari yang paling serius, dengan file:baris dan saran perbaikan. Jangan mengubah kode.
