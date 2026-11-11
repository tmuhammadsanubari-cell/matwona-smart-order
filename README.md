# Matwona Smart Order 🐟🍜

Sistem pemesanan digital berbasis QR meja untuk **Matwona** — rumah makan spesialis olahan tuna segar dan ayam kampung dengan dapur terbuka di Bandung.

Mencakup alur lengkap: **Landing page editorial, pemesanan meja via QR, keranjang & kustomisasi pesanan, checkout mandiri (Kasir & QRIS), pelacakan pesanan realtime, dashboard operasional kasir & dapur, sinkronisasi Olsera POS, mesin rekomendasi AI (FP-Growth), dan analitik penjualan.**

Proyek Computing Project (CAK4CAC3), S-1 Informatika, Telkom University, 2026.

---

## 🎨 Brand & Design System

Aplikasi dirancang dengan pendekatan **Editorial Classic Restaurant Aesthetic** (*anti-slop, human-crafted, tactile & clean*):

- **Palet Warna Utama**:
  - `Matwona Deep Green` (`#106F4D`): Karakter laut & kesegaran bumbu alami, digunakan untuk navigasi, aksen utama, dan tombol aksi penting.
  - `Matwona Warm Cream` (`#FFFFCA`): Nuansa hangat, ramah, dan bersahabat sebagai latar belakang kanvas terpadu.
  - `Dark Ink` (`#1F2A24`): Tipografi tajam dengan kontras tinggi untuk keterbacaan menu di layar HP.
  - `Parchment White` (`#FFFFFF`): Lembar buku menu editorial putih bersih dengan sudut lengkung halus.
- **Tipografi**: Kombinasi font editorial serif yang berkarakter untuk judul naratif dan sans-serif geometris yang bersih untuk nama hidangan, deskripsi, dan harga resmi.
- **Fotografi Asli**: Menghilangkan seluruh emotikon generik/AI slop dan menggantinya dengan foto makanan asli berlisensi (olahan tuna, bakmie, nasi telur barendo krispi, ayam kampung, camilan risol, dan minuman dingin segar).

---

## 📱 Alur Pemesanan Pengguna (End-to-End Design Flow)

```
[ Landing Page ] ➔ [ Scan QR Meja ] ➔ [ Menu Digital & Foto ] ➔ [ Detail & Catatan ]
                                                                       │
[ Pelacakan Realtime ] 🠔 [ Checkout & Pembayaran ] 🠔 [ Floating Cart Sheet ]
```

### 1. Landing Page Editorial (`/`)
- **Hero Editorial**: Narasi utama *"Two worlds. One table. Simply, makan."* dengan foto sajian utama di bingkai elegan.
- **Lembar Buku Menu Terpadu**: Sajian lengkap 2 kolom seimbang (Olahan Tuna & Bakmie di kiri; Nasi Telur Barendo, Camilan, dan Minuman Segar di kanan) tanpa garis pembatas kaku horizontal.
- **Detail Kunjungan & Dapur Terbuka**: Informasi jam operasional, alamat di Bandung, 4 pilar dapur terbuka, dan tombol akses langsung ke demo pemesanan meja.

### 2. Menu Digital Meja (`/m/matwona/t/<qrToken>`)
- **Akses Cepat & Aman**: Setiap meja fisik memiliki token QR acak 128-bit base62 kriptografis (contoh demo: `/m/matwona/t/tok-meja-01` untuk Meja 1).
- **Tab Kategori Lengkap**: Tab geser horizontal yang responsif untuk navigasi instan antar-kategori hidangan.
- **Kartu Menu Kaya Visual**: Dilengkapi foto makanan 4:3, nama menu, cuplikan deskripsi lauk, harga format Rupiah standar, status ketersediaan (*Habis*), serta tombol aksi cepat `+ Tambah`.
- **Pencarian Real-Time**: Kolom pencarian responsif untuk mencari hidangan berdasarkan nama atau bumbu.

### 3. Detail Menu & Catatan Kustom (`MenuDetailSheet`)
- **Bottom Sheet Interaktif**: Membuka foto hidangan resolusi tinggi, deskripsi bahan komplit, dan total harga dinamis.
- **Input Catatan Pesanan**: Kolom catatan khusus (maks. 120 karakter) seperti *"sambal dipisah"* atau *"tidak pedas"*.
- **Stepper Jumlah**: Tombol tambah/kurang kuantitas porsi yang mudah dioperasikan dengan satu jempol di HP.

### 4. Keranjang Belanja Floating (`CartSheet`)
- **Floating Cart Bar**: Bar melayang di bagian bawah layar yang responsif, menampilkan total item dan nominal rupiah secara langsung setelah hidangan pertama ditambahkan.
- **Manajemen Keranjang**: Pelanggan dapat membuka sheet keranjang untuk memeriksa ulang pesanan, mengubah jumlah porsi per item, atau mengedit catatan kustom sebelum melakukan checkout.

### 5. Proses Checkout Mandiri (`/m/matwona/t/<qrToken>/checkout`)
- **Konfirmasi Meja & Pesanan**: Menampilkan label meja fisik (misal: *Meja 1*) dan ringkasan seluruh porsi yang dipesan.
- **Identitas Pemesan**: Input nama pelanggan untuk memudahkan kasir dan pelayan memanggil pemesan.
- **Pilihan Metode Pembayaran**:
  - **Bayar di Kasir**: Pelanggan memesan mandiri dari meja, lalu melakukan pembayaran tunai/kartu di kasir.
  - **QRIS Dinamis**: Langsung membuat kode QRIS dinamis untuk pembayaran digital instan tanpa antre.

### 6. Pelacakan Pesanan Realtime (`/m/matwona/order/<orderCode>`)
- **Status Alur Pesanan Live**: Pelanggan dapat melihat perkembangan sajian langsung di layar HP via WebSocket / polling:
  - 🟡 **Baru**: Pesanan masuk ke sistem.
  - 🔵 **Diproses**: Dapur terbuka sedang memasak hidangan.
  - 🟣 **Disajikan**: Pelayan membawa makanan ke meja.
  - 🟢 **Selesai**: Transaksi selesai dinikmati.
- **Drawer QRIS Interaktif**: Jika memilih QRIS, modal pembayaran QRIS dilengkapi hitung mundur batas waktu (expiry countdown) dan tombol cek status pembayaran otomatis.

---

## 🖥️ Portal Operasional Kasir & Admin

- **Dashboard Kasir Kanban (`/cashier`)**:
  - Pemantauan pesanan multi-kolom realtime (*Baru*, *Diproses*, *Disajikan*, *Selesai*).
  - Notifikasi suara saat ada pesanan baru masuk.
  - Integrasi cetak struk pesanan thermal format 58mm / 80mm.
- **Portal Kelola Admin (`/admin`)**:
  - **Sinkronisasi Olsera POS (`/admin/sync`)**: Impor katalog menu & ekspor rekapitulasi transaksi berbasis file CSV Olsera.
  - **Analitik Penjualan (`/admin/analytics`)**: Grafik tren omzet harian, menu terlaris, dan performa per jam.
  - **Manajemen Menu & Stok (`/admin/menu`)**: Tambah, edit harga, toggle status menu habis/tersedia, dan kelola kategori.
  - **Rekomendasi Menu AI (`/admin/recommendations`)**: Model Association Rule Mining (FP-Growth) untuk mendeteksi pasangan menu favorit dan meningkatkan nilai rata-rata keranjang belanja (*cross-selling*).

---

## 🏗️ Arsitektur & Teknologi

```
matwona-smart-order/
├── apps/
│   ├── web/        Next.js 15 (App Router, React 19, Tailwind CSS v4, Lucide Icons)
│   ├── api/        NestJS 11 (REST API, WebSocket Gateway, Prisma ORM, Redis Cache & Pub/Sub)
│   └── reco/       FastAPI (Python 3.12, Mlxtend FP-Growth, Uvicorn)
├── packages/
│   └── shared/     Skema Zod, tipe TypeScript bersama, konstanta status & harga
├── infra/          Docker Compose untuk PostgreSQL 14 & Redis
└── docs/           PRD, Backlog, ADR, API Spec, Desain, & Dokumen ComPro
```

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- Node.js 22 LTS + pnpm (`corepack enable`)
- PostgreSQL 14 & Redis (via Docker atau WSL)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) (untuk service rekomendasi AI)

### Langkah Instalasi
```bash
# 1. Klon repositori & salin konfigurasi env
cp .env.example .env

# 2. Pasang dependensi monorepo
corepack enable
pnpm install

# 3. Migrasi & Seed Database
pnpm db:migrate
pnpm db:seed

# 4. Jalankan Server Pengembangan
pnpm dev

# 5. Jalankan Service Rekomendasi Menu (Terminal Baru)
cd apps/reco
uv sync
uv run fastapi dev app/main.py --port 8000
```

### URL Akses Lokal
| Halaman | URL | Keterangan |
|---------|-----|------------|
| **Landing Page** | `http://localhost:3000` | Sajian editorial, jam buka, dan info resto |
| **Demo Menu Meja 1** | `http://localhost:3000/m/matwona/t/tok-meja-01` | Menu digital lengkap dengan foto & checkout |
| **Portal Kasir** | `http://localhost:3000/cashier` | Login: `kasir@matwona.local` / `Kasir123!` |
| **Portal Admin** | `http://localhost:3000/admin` | Login: `admin@matwona.local` / `Admin123!` |
| **API Backend** | `http://localhost:4000/api` | Swagger / REST Endpoints |
| **Service Reco** | `http://localhost:8000/docs` | Dokumentasi OpenAPI FP-Growth |

---

## 🧪 Pengujian & Kualitas Kode

Aplikasi diuji secara komprehensif dengan cakupan 100% passing tests:
- **`apps/web`**: 18 test suite (197 unit & component tests passing).
- **`apps/api`**: 16 test suite (149 integration & unit tests passing).
- **`apps/reco`**: 4 algorithmic & API tests passing.

Jalankan pengujian:
```bash
pnpm --filter web test      # Menjalankan pengujian frontend
pnpm --filter api test      # Menjalankan pengujian backend
cd apps/reco && uv run pytest  # Menjalankan pengujian model AI
```

---

## 📄 Lisensi & Hak Cipta
© 2026 Matwona Kitchen Bandung & Tim Computing Project S-1 Informatika, Telkom University.  
Aset foto berlisensi via Wikimedia Commons (CC BY-SA 4.0 / CC BY-SA 3.0 / CC0 / Public Domain) & Matwona Kitchen Studio.
