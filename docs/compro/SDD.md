# Software Design Description (SDD) — Matwona Smart Order

> Sumber: PRD Bagian 3 & 4, `docs/adr/`. Status: Draft.

## 1. Pendahuluan
## 2. Arsitektur Sistem
### 2.1 Diagram Arsitektur (PRD 3.1)
### 2.2 Deployment Architecture (Vercel, Cloud Run, PostgreSQL, Redis, Cloudinary, Midtrans)
### 2.3 Keputusan Desain & Justifikasi Teknologi (ADR 0001–0003)

## 3. Desain Komponen / Modul
| Modul | Tanggung jawab | Antarmuka |
|---|---|---|
| auth | Login staf, JWT, RBAC | `/auth/*` |
| tables | Meja & token QR | `/public/tables`, `/tables` |
| menu | Kategori & item | `/public/outlets/:slug/menu`, `/categories`, `/menu-items` |
| orders | Pembuatan & status pesanan | `/public/orders`, `/orders` |
| payments | Midtrans QRIS & webhook | `/public/orders/:code/pay`, `/payments/midtrans/notification` |
| realtime | Socket.IO gateway | namespace `/realtime` |
| promos | Promo | `/promos` |
| pos-sync | Adapter Olsera | `/pos-sync/*` |
| analytics | Agregasi penjualan | `/analytics/*` |
| recommendations | Proxy & event | `/public/recommendations`, `/recommendations/*` |
| reco (Python) | Training & penyajian rekomendasi | `/internal/*` |

## 4. Desain Data
### 4.1 ERD (PRD 3.2)
### 4.2 Kamus Data (PRD 4.2)
### 4.3 State Machine Pesanan

## 5. Desain Antarmuka API
_(PRD 4.3 + contoh request/response)_

## 6. Desain Alur / Proses
### 6.1 Sequence pemesanan & QRIS (PRD 3.4.1)
### 6.2 Sequence training rekomendasi (PRD 3.4.2)
### 6.3 Alur sinkronisasi Olsera (PRD 3.3.3)
### 6.4 DFD level 0 & 1 _(tambahkan bila diminta Dosen Pendamping)_

## 7. Desain Model AI
- Data: order_items (riwayat Olsera + pesanan digital), preprocessing, one-hot
- Algoritma: FP-Growth + association rules; popularitas per slot waktu
- Parameter & tuning
- Evaluasi offline (HitRate@3, Precision@3, coverage vs baseline) & hasil
- Penyajian & fallback

## 8. Desain Keamanan
_(PRD 4.4, NFR-005…011)_

## 9. Desain Antarmuka Pengguna
_(Tautan Figma + screenshot utama, token brand dari `docs/design/BRAND.md`)_
