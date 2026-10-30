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
| ✅ | GET | `/public/outlets/:slug/menu` | publik |
| ⬜ | GET | `/public/outlets/:slug/promos` | publik |
| ✅ | GET | `/public/tables/:token` | publik |
| ✅ | POST | `/public/orders` | table token |
| ⬜ | GET | `/public/orders/:code` | table token |
| ⬜ | POST | `/public/orders/:code/pay` | table token |
| ⬜ | GET | `/public/recommendations` | publik |
| ⬜ | POST | `/public/recommendation-events` | publik |

Catatan implementasi (S1-06):
- `POST /public/orders` wajib header `X-Table-Token` dan `Idempotency-Key` (UUID). Body `{ customerName, customerPhone?, paymentMethod: "CASHIER"|"QRIS", items: [{ menuItemId, quantity, note?, fromRecommendation?, expectedUnitPrice? }], recommendationSessionId? }` (skema `createOrderSchema`). Field lain (mis. harga/total dari klien) diabaikan.
- 201 → `PublicOrderDto`: `{ orderCode, table, customerName, status, paymentMethod, paymentStatus, subtotalAmount, discountAmount, totalAmount, items: [{ menuItemId, name, quantity, unitPrice, discountAmount, lineTotal, note }], createdAt }`. `CASHIER` → `paymentStatus = UNPAID`; `QRIS` → `PENDING` (transaksi Midtrans dibuat terpisah di S2-01).
- Harga & total selalu dihitung ulang dari DB (NFR-007). `expectedUnitPrice` opsional, yaitu harga yang dilihat pelanggan; jika berbeda dari DB → 409 `PRICE_CHANGED` (`details.items: [{ menuItemId, name, expectedUnitPrice, unitPrice }]`).
- Item tidak dikenal, diarsipkan, ditandai habis, atau stok kurang (dijumlah per menu) → 409 `ITEM_UNAVAILABLE` (`details.items: [{ menuItemId, name }]`). Dicek lebih dulu daripada `PRICE_CHANGED`.
- Stok item yang dilacak (`stock != null`) dikurangi dalam transaksi yang sama dengan `SELECT … FOR UPDATE`, lalu cache menu publik di-invalidate.
- Kode pesanan `MTW-YYMMDD-XXXX` (tanggal WIB, nomor urut per hari, diserialisasi dengan advisory lock).
- `Idempotency-Key` yang sudah dipakai → 409 `DUPLICATE_REQUEST` dengan `details.order` = pesanan awal (hanya jika meja sama; meja lain tanpa `details`). Request ulang tidak dihitung rate limit.
- Rate limit (NFR-009): maks. `ORDER_RATE_LIMIT_MAX` (5) pesanan per `ORDER_RATE_LIMIT_WINDOW_SEC` (600 dtk) per meja **dan** per IP → 429 `RATE_LIMITED`. Counter di Redis; bila Redis mati, memakai counter in-memory per instance. IP klien diambil dari `X-Forwarded-For` sesuai `TRUST_PROXY_HOPS` (default 1, untuk Cloud Run).
- Token tidak valid/kosong/meja nonaktif → 400 `INVALID_TABLE_TOKEN`. Header `Idempotency-Key` bukan UUID → 400 `VALIDATION_ERROR`.
- Diskon promo selalu 0 sampai S3-08; event `order.created` menyusul di S1-08.

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
| ✅ | GET/POST | `/categories` | ADMIN |
| ✅ | PUT/DELETE | `/categories/:id` | ADMIN |
| ✅ | PATCH | `/categories/reorder` | ADMIN |
| ✅ | GET | `/menu-items` | CASHIER, ADMIN |
| ✅ | POST | `/menu-items` | ADMIN |
| ✅ | PUT/DELETE | `/menu-items/:id` | ADMIN |
| ✅ | PATCH | `/menu-items/:id/availability` | CASHIER, ADMIN |
| ⬜ | POST | `/menu-items/:id/image` | ADMIN (S2-11) |

Catatan implementasi (S1-03):
- `GET /public/outlets/:slug/menu` → `PublicMenu`: `{ outlet, categories: [{ id, name, items: [{ id, name, description, price, imageUrl, isAvailable }] }] }`. Hanya kategori aktif yang punya item non-arsip; urut `sortOrder` lalu nama. `isAvailable = false` bila ditandai habis **atau** `stock = 0`. Harga promo menyusul di S3-08.
- Cache Redis key `menu:v1:<slug>`, TTL 60 detik, di-invalidate setiap perubahan kategori/item. Bila Redis mati, API langsung membaca DB (tidak error).
- `GET /categories` → `CategoryDto[]` (dengan `itemCount` item non-arsip). `POST` body `{ name, sortOrder?, isActive? }`. `PUT /categories/:id` parsial. `PATCH /categories/reorder` body `{ ids: [...] }` wajib memuat **semua** kategori outlet; `sortOrder` = posisi. `DELETE` hanya untuk kategori tanpa item (termasuk arsip) → selain itu 409 `CATEGORY_NOT_EMPTY`.
- `GET /menu-items?categoryId=&archived=true|false` (default non-arsip) → `MenuItemDto[]`, termasuk `olseraProductId` & `lastSyncedAt` untuk ikon "tersinkron Olsera".
- `POST /menu-items` body `{ categoryId, name, price, description?, stock?, sku?, isAvailable?, sortOrder? }`; `PUT /menu-items/:id` parsial (field yang tidak dikirim tidak berubah). Harga integer Rupiah ≥ 0. SKU unik per outlet → 409 `SKU_TAKEN`. Kategori outlet lain → 404.
- `PATCH /menu-items/:id/availability` body `{ isAvailable }`; item arsip → 404.
- `DELETE /menu-items/:id` **mengarsipkan** (`isArchived = true`), tidak menghapus permanen; response `MenuItemDto`.

## Meja & QR (FR-011)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET/POST | `/tables` | ADMIN |
| ✅ | PUT | `/tables/:id` | ADMIN |
| ⬜ | POST | `/tables/:id/regenerate-token` | ADMIN (S2-04) |
| ⬜ | GET | `/tables/qr.pdf` | ADMIN (S2-04) |

Catatan implementasi (S1-02):
- `GET /tables` → `DiningTableDto[]` (`id, label, capacity, qrToken, isActive`) milik outlet admin, diurutkan natural (`2` sebelum `10`).
- `POST /tables` body `{ label, capacity? }` atau bulk `{ labels: ["A1","A2"] }` (maks. 100) → 201 `DiningTableDto[]`. Label di-trim, maks. 20 karakter, unik per outlet; bentrok → 409 `TABLE_LABEL_TAKEN` (`details.labels`).
- `PUT /tables/:id` body parsial `{ label?, capacity?, isActive? }` (minimal satu field). Meja outlet lain → 404 `NOT_FOUND`. Meja tidak dihapus; nonaktifkan dengan `isActive: false`.

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
