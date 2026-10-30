# ADR 0003 — Rekomendasi Menu: FP-Growth + Popularitas per Slot Waktu

- **Status:** Diterima
- **Tanggal:** 30 Oktober 2026

## Konteks

Panduan ComPro mensyaratkan minimal satu kriteria solusi (dipilih: AI, data mining, cloud). Pelanggan memesan sebagai tamu, sehingga tidak ada riwayat per pengguna untuk collaborative filtering. Data yang tersedia adalah keranjang transaksi (riwayat Olsera + pesanan digital). Katalog menu kecil (puluhan item).

## Keputusan

1. **Association rules dengan FP-Growth** (`mlxtend`) untuk "Sering dibeli bersama" berdasarkan isi keranjang. Parameter awal: `min_support=0.01`, `min_confidence=0.2`, `lift>1`, dapat di-tuning lewat env setelah EDA.
2. **Popularitas per slot waktu** (pagi/siang/sore/malam, 30 hari terakhir) untuk "Populer sekarang" dan sebagai fallback cold start.
3. Training batch harian (Cloud Scheduler 03:00 WIB) + manual dari admin. Hasil disimpan di `recommendation_rules`; penyajian hanya membaca tabel sehingga cepat (≤ 300 ms).
4. Evaluasi offline: holdout 20% transaksi terbaru, metrik HitRate@3, Precision@3, coverage, dibandingkan baseline "menu terlaris". Evaluasi online: CTR, attach rate, AOV dengan vs tanpa item rekomendasi.

## Alternatif

- **Collaborative filtering per pengguna:** tidak mungkin tanpa identitas pelanggan.
- **Apriori:** hasil setara tetapi lebih lambat; FP-Growth lebih efisien dan tetap mudah dijelaskan saat tanya-jawab.
- **LLM untuk rekomendasi:** mahal, sulit dievaluasi, dan tidak memanfaatkan data transaksi outlet.

## Konsekuensi

- (+) Mudah dijelaskan ke penguji dan owner ("menu A sering dipesan bersama B").
- (+) Ada metrik kuantitatif untuk laporan.
- (−) Kualitas bergantung jumlah transaksi; mitigasi dengan impor riwayat Olsera dan fallback popularitas.
