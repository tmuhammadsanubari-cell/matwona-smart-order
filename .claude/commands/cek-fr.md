---
description: Audit apakah acceptance criteria satu FR sudah terimplementasi dan teruji
argument-hint: <FR-xxx>
---

Audit **$ARGUMENTS**:

1. Ambil seluruh acceptance criteria $ARGUMENTS dari `docs/PRD.md` (bagian 2.2 yang merujuk FR ini).
2. Untuk setiap kriteria, cari implementasinya di kode dan test yang membuktikannya (`*.spec.ts`, `*.e2e-spec.ts`, `tests/*.py`, Playwright di `apps/web/e2e`).
3. Buat tabel: Kriteria | Status (✅ terimplementasi + teruji / 🟡 terimplementasi tanpa test / ❌ belum) | File bukti.
4. Untuk kriteria 🟡 dan ❌, usulkan langkah konkret (test apa yang perlu ditulis, kode apa yang kurang).

Jangan mengubah kode kecuali saya minta. Hasil ini dipakai sebagai bahan traceability SRS → test case di dokumen UAT.
