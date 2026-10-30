# CLAUDE.md — apps/reco (FastAPI)

Baca `CLAUDE.md` root dan `docs/adr/0003-rekomendasi-fp-growth.md` dulu.

## Perintah

```bash
uv sync                                   # install
uv run fastapi dev app/main.py --port 8000
uv run pytest
uv run ruff check . && uv run ruff format .
```

## Sudah Ada

- `app/services/miner.py`: `mine_rules` (FP-Growth + association rules, consequent tunggal) dan `recommend_for_cart` (filter item di keranjang & habis). Teruji di `tests/test_miner.py`.
- `app/services/popularity.py`: `time_slot` (slot WIB). Teruji.
- `app/main.py`: `/health`, kerangka `/internal/recommend` & `/internal/train` (501) dengan proteksi `X-Internal-Key`.

## Yang Harus Dibangun

- `app/db.py`: engine SQLAlchemy dari `RECO_DATABASE_URL`, query keranjang per pesanan (`orders` PAID & tidak CANCELLED, termasuk `source = OLSERA_IMPORT`).
- `app/services/evaluate.py` (S3-02): split holdout berdasarkan waktu (20% terbaru), untuk setiap pesanan holdout sembunyikan 1 item, hitung HitRate@3 / Precision@3 / coverage; bandingkan dengan baseline terlaris.
- `/internal/train` (S3-01): tulis `recommendation_rules` (nonaktifkan versi lama) dan `recommendation_models` dengan `model_version = fpg-YYYYMMDD-HHMM`.
- `/internal/recommend` (S3-03): baca rule aktif; fallback `POPULAR_SLOT`. Target ≤ 300 ms (cache rule di memori per `model_version`).

## Aturan

- Service ini **hanya membaca** tabel transaksi dan **hanya menulis** `recommendation_rules` & `recommendation_models`. Jangan mengubah tabel lain; skema dikelola Prisma di `apps/api`.
- Nama tabel/kolom snake_case sesuai `apps/api/prisma/schema.prisma`.
- Jangan log data pelanggan (nama/HP).
- Parameter mining dari env (`RECO_MIN_SUPPORT`, dst.), jangan hardcode.
