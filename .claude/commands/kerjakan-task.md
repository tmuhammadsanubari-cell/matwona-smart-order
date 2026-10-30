---
description: Kerjakan satu task dari docs/BACKLOG.md sampai memenuhi Definition of Done
argument-hint: <ID task, mis. S1-03>
---

Kerjakan task **$ARGUMENTS** dari `docs/BACKLOG.md`.

Langkah:
1. Baca baris task $ARGUMENTS di `docs/BACKLOG.md`, catat FR/NFR yang dirujuk.
2. Buka `docs/PRD.md`, baca deskripsi, user story, acceptance criteria, dan catatan teknis FR tersebut. Cek juga tabel database (4.2) dan endpoint (4.3) yang relevan.
3. Baca `CLAUDE.md` root dan `CLAUDE.md` app yang disentuh. Patuhi "Aturan Bisnis yang Tidak Boleh Dilanggar".
4. Tulis rencana singkat (file yang akan dibuat/diubah, test yang akan ditulis). Jika task bergantung pada task lain yang belum selesai, beri tahu dan berhenti.
5. Implementasikan. Tulis test untuk setiap acceptance criteria yang bisa diuji otomatis; sebutkan yang hanya bisa diuji manual.
6. Jalankan `pnpm lint && pnpm typecheck && pnpm test` (dan `cd apps/reco && uv run pytest` bila menyentuh reco). Perbaiki sampai lulus.
7. Perbarui `docs/API.md` bila ada endpoint baru/berubah. Centang task di `docs/BACKLOG.md`.
8. Ringkas hasil: apa yang dibuat, acceptance criteria mana yang terpenuhi, apa yang masih perlu dicek manual. Usulkan pesan commit Conventional Commits dengan ID FR.
