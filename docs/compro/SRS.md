# Software Requirement Specification (SRS) — Matwona Smart Order

> Disusun mengikuti struktur IEEE 830/29148 yang disederhanakan. Sumber: PRD 1.5, 1.6, Bagian 2. Status: Draft.

## 1. Pendahuluan
### 1.1 Tujuan
### 1.2 Ruang Lingkup Produk
### 1.3 Definisi, Akronim, Singkatan
### 1.4 Referensi (PRD, BRS, Panduan ComPro 2026, Brand Guideline Matwona)

## 2. Deskripsi Umum
### 2.1 Perspektif Produk (diagram konteks: Pelanggan, Kasir, Admin, Midtrans, Olsera, AI service)
### 2.2 Fungsi Produk (ringkas per modul)
### 2.3 Karakteristik Pengguna (PRD 1.3)
### 2.4 Batasan (PRD 1.7)
### 2.5 Asumsi & Ketergantungan

## 3. Kebutuhan Fungsional
Untuk setiap FR (FR-001 … FR-025) gunakan format:

### FR-001 Scan QR meja
- **Deskripsi:**
- **Aktor:**
- **Prioritas:** Must Have
- **Prakondisi:**
- **Alur utama:**
- **Alur alternatif/eksepsi:**
- **Pascakondisi:**
- **Acceptance criteria:** (salin dari PRD 2.2.1)

_(ulangi untuk seluruh FR)_

### 3.x Use Case Diagram
_(Pelanggan, Kasir, Admin/Owner, Sistem Midtrans, Scheduler)_

## 4. Kebutuhan Non-Fungsional
_(Salin tabel NFR-001 … NFR-020 dari PRD 1.6, tambahkan metode verifikasi tiap NFR: Lighthouse, k6, ZAP, SUS, dll.)_

## 5. Kebutuhan Antarmuka
### 5.1 Antarmuka Pengguna (rujuk mockup Figma)
### 5.2 Antarmuka Perangkat Lunak (Midtrans, Olsera CSV/API, Cloudinary, Google Maps)
### 5.3 Antarmuka Komunikasi (HTTPS REST, WebSocket)

## 6. Kebutuhan Data
_(Ringkasan entitas dari PRD 4.2)_

## 7. Matriks Traceability
| BR | FR | Fitur PRD | Test Case | UAT |
|---|---|---|---|---|
| BR-01 | FR-001 | 2.2.1 | TC-001… | UAT-01 |
| BR-02 | FR-005 | 2.2.3 | TC-… | UAT-02 |
_(lengkapi; gunakan `/cek-fr` di Claude Code untuk menelusuri test)_
