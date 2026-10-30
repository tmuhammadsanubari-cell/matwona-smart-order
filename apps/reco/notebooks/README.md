# Notebooks

Untuk EDA data transaksi Olsera dan PoC FP-Growth (task S1-12). Hasil (grafik, tabel rule, metrik) dipakai di SDD bagian "Desain Model AI" dan laporan final.

Rencana notebook:
1. `01_eda_transaksi.ipynb`: jumlah transaksi, item per keranjang, distribusi menu, jam ramai.
2. `02_fpgrowth_poc.ipynb`: tuning `min_support`/`min_confidence`, 20 rule teratas.
3. `03_evaluasi.ipynb`: holdout 20%, HitRate@3 / Precision@3 vs baseline terlaris.

Baca data dari folder `data/` di root (di-gitignore). Jangan menyimpan output yang memuat data pelanggan.
Jalankan: `cd apps/reco && uv run jupyter lab`
