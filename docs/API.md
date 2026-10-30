# Kontrak API — Matwona Smart Order

Base URL lokal: `http://localhost:4000/api`. Spesifikasi lengkap (contoh request/response, kode error) ada di `docs/PRD.md` bagian 4.3–4.5. File ini adalah daftar kerja yang **wajib diperbarui** setiap kali endpoint ditambah/diubah.

Legenda status: ⬜ belum · 🟨 sedang dikerjakan · ✅ selesai & teruji

Header khusus:
- `X-Table-Token`: token meja (akses pelanggan)
- `Idempotency-Key`: UUID per pembuatan pesanan
- `X-CSRF-Token`: wajib pada request staf yang mengubah data
- `X-Internal-Key`: API → reco

## Health
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/health` | publik |

## Auth (FR-009)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | POST | `/auth/login` | publik |
| ✅ | POST | `/auth/refresh` | cookie refresh |
| ✅ | POST | `/auth/logout` | publik (cookie refresh opsional) |
| ✅ | GET | `/auth/me` | staf |

Catatan implementasi (S1-01):
- Cookie: `mtw_access` (HttpOnly, path `/`, 15 menit), `mtw_refresh` (HttpOnly, path `/api/auth`, 7 hari), `mtw_csrf` (bisa dibaca JS, path `/`). Semua `SameSite=Lax`; `Secure` aktif saat `NODE_ENV=production` atau `COOKIE_SECURE=true`. `COOKIE_DOMAIN` opsional untuk web & api beda subdomain.
- `login` & `refresh` → `{ success: true, data: { user: AuthUser, csrfToken } }`. Kirim `csrfToken` sebagai header `X-CSRF-Token` pada request staf `POST/PUT/PATCH/DELETE` (selain endpoint publik); jika tidak cocok → 403 `FORBIDDEN`.
- `login`: email/password salah → 401 `UNAUTHORIZED`; gagal ke-5 berturut-turut atau akun masih terkunci → 423 `ACCOUNT_LOCKED` (`details.lockedUntil`); akun nonaktif → 401 dan semua refresh token dicabut.
- `refresh`: rotasi setiap dipakai. Memakai ulang token lama mencabut semua sesi user. Gagal → 401 dan cookie dihapus.
- `logout` sengaja publik (menyimpang dari PRD 4.3 "✅") agar tetap bisa mencabut refresh token & menghapus cookie walau access token sudah kedaluwarsa.
- Semua endpoint wajib login kecuali yang ditandai `@Public()`. Klien non-browser boleh memakai `Authorization: Bearer <access>` (tanpa cek CSRF). Endpoint ber-`@Roles(...)` menolak role lain dengan 403 `FORBIDDEN`.

## Publik (FR-001…007, FR-012, FR-015)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/public/outlets/:slug` | publik |
| ⬜ | GET | `/public/outlets/:slug/menu` | publik |
| ⬜ | GET | `/public/outlets/:slug/promos` | publik |
| ⬜ | GET | `/public/tables/:token` | publik |
| ⬜ | POST | `/public/orders` | table token |
| ⬜ | GET | `/public/orders/:code` | table token |
| ⬜ | POST | `/public/orders/:code/pay` | table token |
| ⬜ | GET | `/public/recommendations` | publik |
| ⬜ | POST | `/public/recommendation-events` | publik |

## Pembayaran (FR-005)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | POST | `/payments/midtrans/notification` | signature |

## Pesanan (FR-006, FR-008)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/orders` | CASHIER, ADMIN |
| ⬜ | GET | `/orders/:id` | CASHIER, ADMIN |
| ⬜ | PATCH | `/orders/:id/status` | CASHIER, ADMIN |
| ⬜ | POST | `/orders/:id/mark-paid` | CASHIER, ADMIN |
| ⬜ | POST | `/orders/:id/cancel` | CASHIER, ADMIN |

## Menu (FR-010)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET/POST | `/categories` | ADMIN |
| ⬜ | PUT/DELETE | `/categories/:id` | ADMIN |
| ⬜ | PATCH | `/categories/reorder` | ADMIN |
| ⬜ | GET | `/menu-items` | CASHIER, ADMIN |
| ⬜ | POST | `/menu-items` | ADMIN |
| ⬜ | PUT/DELETE | `/menu-items/:id` | ADMIN |
| ⬜ | PATCH | `/menu-items/:id/availability` | CASHIER, ADMIN |
| ⬜ | POST | `/menu-items/:id/image` | ADMIN |

## Meja & QR (FR-011)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET/POST | `/tables` | ADMIN |
| ⬜ | PUT | `/tables/:id` | ADMIN |
| ⬜ | POST | `/tables/:id/regenerate-token` | ADMIN |
| ⬜ | GET | `/tables/qr.pdf` | ADMIN |

## Promo & Staf (FR-020, FR-021)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET/POST | `/promos` | ADMIN |
| ⬜ | PUT/DELETE | `/promos/:id` | ADMIN |
| ⬜ | GET/POST | `/users` | ADMIN |
| ⬜ | PATCH | `/users/:id` | ADMIN |
| ⬜ | POST | `/users/:id/reset-password` | ADMIN |

## Analitik (FR-017…019)
Semua menerima `from`, `to`, `source=all|digital|olsera`.
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/analytics/summary` | ADMIN |
| ⬜ | GET | `/analytics/sales-trend` | ADMIN |
| ⬜ | GET | `/analytics/top-items` | ADMIN |
| ⬜ | GET | `/analytics/peak-hours` | ADMIN |
| ⬜ | GET | `/analytics/menu-engineering` | ADMIN |
| ⬜ | GET | `/analytics/recommendation-performance` | ADMIN |
| ⬜ | GET | `/analytics/export.csv` | ADMIN |

## Sinkronisasi Olsera (FR-013, FR-014)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | POST | `/pos-sync/products/preview` | ADMIN |
| ⬜ | POST | `/pos-sync/products/apply` | ADMIN |
| ⬜ | POST | `/pos-sync/history/import` | ADMIN |
| ⬜ | GET | `/pos-sync/transactions/export.csv` | ADMIN |
| ⬜ | GET/PUT | `/pos-sync/mappings/:entity` | ADMIN |
| ⬜ | GET | `/pos-sync/logs` | ADMIN |

## Rekomendasi admin (FR-022)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/recommendations/rules` | ADMIN |
| ⬜ | GET | `/recommendations/models` | ADMIN |
| ⬜ | POST | `/recommendations/train` | ADMIN |

## AI service internal (`apps/reco`, port 8000)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ⬜ | GET | `/health` | publik |
| ⬜ | GET | `/internal/recommend` | X-Internal-Key |
| ⬜ | POST | `/internal/train` | X-Internal-Key / OIDC |

## WebSocket `/realtime`
| Event | Room |
|---|---|
| `order.created` | `outlet:<id>:cashier` |
| `order.updated` | `outlet:<id>:cashier`, `order:<code>` |
| `payment.updated` | `outlet:<id>:cashier`, `order:<code>` |
| `menu.updated` | `outlet:<id>:menu` |
