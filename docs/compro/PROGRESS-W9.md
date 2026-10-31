# Slide Progres Minggu 9 — Matwona Smart Order (MVP Review)

> **Untuk:** presenter tim (PM/SA) di depan Dosen Pendamping · **Durasi target:** 10–12 menit + demo 5 menit + tanya-jawab.
> **Status:** kerangka isi + naskah. Deck final dibuat dari file ini sesuai format/template yang diminta (PowerPoint/Google Slides).
> Angka di bawah adalah kondisi `main` per **31 Oktober 2026**; perbarui sebelum presentasi bila ada PR baru.
> Bagian bertanda **[ISI TIM]** membutuhkan data dari tim/mitra.

---

## Slide 1 — Judul

- **Matwona Smart Order**: pemesanan digital berbasis QR meja untuk rumah makan spesialis tuna & ayam kampung, Bandung.
- Computing Project CAK4CAC3 · S-1 Informatika Telkom University · Tim **[ISI TIM: nama tim]**
- Anggota & peran: **[ISI TIM: 7 nama + peran sesuai PRD Lampiran C]**

## Slide 2 — Masalah Mitra

- Saat ramai, pelanggan antre di kasir untuk memesan; pesanan dicatat manual → antrean panjang & salah catat.
- Owner belum punya gambaran menu mana yang sering dipesan bersama dan jam ramai.
- Menu, harga, dan stok sudah dikelola di POS **Olsera**: sistem baru harus melengkapi, bukan menggantikan.

> *Naskah:* tekankan bahwa solusi tidak mengganti Olsera; Smart Order menangani pemesanan digital, Olsera tetap sumber data master.

## Slide 3 — Solusi

Alur: **scan QR di meja → pilih menu → kirim pesanan → kasir menerima realtime → bayar → status pesanan berubah di HP pelanggan**.

Tiga pengguna: pelanggan (tanpa login), kasir, owner. Nilai tambah: rekomendasi menu berbasis data transaksi outlet (FP-Growth) & analitik.

## Slide 4 — Arsitektur & Teknologi

- Gambar: diagram arsitektur dari `docs/compro/SDD.md` §2.1.
- Monorepo: Next.js 16 (web) · NestJS 12 + PostgreSQL + Redis + Socket.IO (API) · FastAPI + mlxtend (AI, sprint 3).
- Keputusan kunci (ADR): server sumber kebenaran harga & status; Olsera lewat adapter CSV (API belum tersedia); AI terpisah dan boleh mati tanpa mengganggu pemesanan.

## Slide 5 — Progres Sprint

| Sprint | Selesai | Isi |
|---|---|---|
| S0 Fondasi | 5 / 8 | Monorepo, CI, database + seed, design token & komponen UI |
| S1 Core Order (MVP) | 11 / 14 | Auth staf, meja, menu, pesanan, realtime, menu digital, keranjang, checkout, status, dashboard kasir, admin menu |
| S2 Payment & Admin | 2 / 12 | Meja & QR: token baru + PDF QR siap cetak + halaman admin (sudah lebih awal) |

- **16 pull request** di-merge, semuanya melewati CI otomatis.
- Sisa S1: deploy staging (S1-13, menunggu keputusan domain), EDA/PoC AI (S1-12, menunggu data Olsera), dokumen ini (S1-14).

## Slide 6 — Fitur MVP (screenshot)

Empat screenshot HP 360 px (buat dengan `pnpm --filter web ui:check`, lihat `apps/web/CLAUDE.md`):

1. Menu meja (tab kategori, label Habis, pencarian)
2. Keranjang (bottom sheet + total)
3. Status pesanan realtime
4. Dashboard kasir (kolom Baru/Diproses/Disajikan/Selesai)

Ditambah 1 foto **kartu QR meja hasil cetak** (PDF A6).

## Slide 7 — Bukti Kualitas

| Bukti | Angka |
|---|---|
| Test otomatis | **349** (135 unit API, 155 unit/komponen web, 59 e2e API dengan Postgres + Redis) |
| Coverage baris | API 72% (orders 90%, tables 86%) · web 85% |
| Pesanan masuk dashboard kasir | **221 ms** (target ≤ 2 detik, NFR-002) |
| Perubahan status kasir → HP pelanggan | **29–98 ms** |
| Konkurensi stok | 3 pelanggan berebut stok terakhir → tepat 1 berhasil, stok tidak minus |
| Pesanan ganda | 3 kirim paralel dengan Idempotency-Key sama → tepat 1 pesanan |
| Aksesibilitas | Kontras warna brand diuji otomatis ≥ 4,5:1; target sentuh ≥ 44 px di 360 px |

> *Naskah:* angka latensi & konkurensi berasal dari uji end-to-end otomatis, bukan perkiraan.

## Slide 8 — Keamanan & Integritas

- Harga & total dihitung ulang di server (harga dari HP diabaikan).
- Token QR acak 128-bit, bisa diganti bila QR bocor; meja nonaktif ditolak.
- Rate limit 5 pesanan / 10 menit per meja & per IP.
- Staf: password bcrypt, sesi cookie HttpOnly + rotasi refresh token, proteksi CSRF, akun terkunci setelah 5× salah.

## Slide 9 — Demo MVP (live, ±5 menit)

Lihat **Skenario Demo** di bawah.

## Slide 10 — Rencana AI (FP-Growth)

- "Sering dibeli bersama" (association rules) + "Populer sekarang" (popularitas per jam).
- Evaluasi: HitRate@3, Precision@3 vs baseline "menu terlaris"; online: CTR & attach rate.
- Status: menunggu **data transaksi Olsera dari mitra** untuk EDA & PoC. **[ISI TIM: status permintaan data / tanggal janji mitra]**

## Slide 11 — Kendala & Mitigasi

| Kendala | Mitigasi |
|---|---|
| API Olsera belum tersedia | Adapter CSV + pemetaan kolom yang bisa diatur |
| Data transaksi Olsera belum diterima | Fallback "menu terlaris"; payload pesanan sudah mencatat item dari rekomendasi |
| Domain untuk staging | **[ISI TIM: keputusan domain]** — dibutuhkan agar login staf berjalan di cloud |
| Mockup Figma & logo resmi | UI mengikuti brand guideline; disesuaikan setelah validasi mitra |

## Slide 12 — Rencana Sprint 2–3

- Sprint 2: QRIS Midtrans + webhook, landing page, sinkronisasi Olsera CSV, upload foto menu, akun staf, deploy staging.
- Sprint 3: AI service (training, evaluasi, rekomendasi), dashboard analitik & menu engineering, promo, uji coba di outlet.

---

## Skenario Demo (MVP: scan QR → pesan → kasir → lunas)

**Persiapan (sebelum presentasi):**

1. Laptop: Docker Desktop menyala, `pnpm infra:up`, `pnpm dev`. Jika staging sudah ada, pakai URL staging.
2. Isi `PUBLIC_WEB_URL` di `.env` dengan alamat yang bisa dijangkau HP (hotspot laptop: `http://192.168.137.1:3000`), restart API.
3. Admin → **Meja & QR** → unduh PDF QR (A6) untuk 1–2 meja → cetak & tempel di meja demo.
4. Bersihkan data uji lama bila perlu (`pnpm db:seed` ulang di database baru) agar dashboard kasir rapi.
5. Buka dashboard kasir di laptop/tablet (`/cashier`, login `kasir@matwona.local`), **ketuk layar sekali** agar suara notifikasi aktif.
6. HP demo tersambung ke hotspot laptop.

**Alur demo (± 5 menit):**

| Langkah | Yang ditunjukkan | Poin bicara |
|---|---|---|
| 1 | Pindai QR tercetak dengan kamera HP | Tanpa aplikasi & tanpa login; token QR unik per meja |
| 2 | Menu: tab kategori, cari "teh", item Habis | Data menu sama dengan yang dikelola admin |
| 3 | Tambah 2 menu + catatan "sambal dipisah" → keranjang | Keranjang tersimpan walau halaman di-refresh |
| 4 | Checkout: isi nama → Kirim pesanan | Harga dihitung ulang di server |
| 5 | **Dashboard kasir berbunyi**, kartu baru di kolom "Baru" | Realtime ≤ 2 detik (terukur 221 ms) |
| 6 | Kasir: Terima → Tandai lunas → Mulai siapkan | Tombol mengikuti aturan status; status bayar tercatat |
| 7 | HP pelanggan: progres & "Lunas" berubah sendiri | Tanpa refresh |
| 8 | (Opsional) Admin: tandai menu Habis → menu pelanggan langsung "Habis" | Kontrol owner |
| 9 | (Opsional) Admin: Ganti QR meja → QR lama ditolak | Keamanan bila QR disalahgunakan |

**Rencana cadangan:** rekam video layar alur demo lengkap sebelum presentasi. Bila jaringan/hotspot bermasalah, putar video lalu lanjutkan tanya-jawab.

## Bank Tanya-Jawab (persiapan)

| Kemungkinan pertanyaan | Jawaban singkat |
|---|---|
| Kenapa tidak pakai aplikasi/akun pelanggan? | Pelanggan rumah makan jarang mau install/daftar; QR + tanpa login memperpendek alur (≤ 4 langkah, NFR-012) |
| Bagaimana jika dua pelanggan memesan stok terakhir bersamaan? | Baris menu dikunci dalam transaksi DB; teruji otomatis, hanya satu yang berhasil |
| Bagaimana mencegah pesanan iseng dari luar outlet? | Token QR acak 128-bit, rate limit per meja & IP, pesanan "bayar di kasir" dikonfirmasi kasir, QR bisa diganti |
| Apa bedanya dengan menu QR biasa? | Terintegrasi dengan alur kasir realtime, data master dari Olsera, dan rekomendasi + analitik dari data transaksi outlet sendiri |
| Kenapa FP-Growth, bukan model lain? | Pelanggan tamu (tanpa riwayat per orang); association rules mudah dijelaskan ke owner & bisa dievaluasi dengan metrik jelas (ADR 0003) |
| Bagaimana jika AI service mati? | Rekomendasi jatuh ke "menu terlaris"; pemesanan tidak terganggu (NFR-020) |
