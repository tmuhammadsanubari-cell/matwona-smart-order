# Kontrak API — Matwona Smart Order

Base URL lokal: `http://localhost:4000/api`. Spesifikasi lengkap (contoh request/response, kode error) ada di `docs/PRD.md` bagian 4.3–4.5. File ini adalah daftar kerja yang **wajib diperbarui** setiap kali endpoint ditambah/diubah.

Legenda status: ⬜ belum · 🟨 sedang dikerjakan · ✅ selesai & teruji

CORS: hanya origin di `WEB_ORIGIN` (dipisah koma). Di luar `NODE_ENV=production`, origin LAN `http://192.168.*.*:3000` juga diterima (HTTP & Socket.IO) agar web bisa diuji di HP lewat Wi-Fi/hotspot laptop.

Header khusus:
- `X-Table-Token`: token meja (akses pelanggan)
- `Idempotency-Key`: UUID per pembuatan pesanan
- `X-CSRF-Token`: wajib pada request staf yang mengubah data
- `X-Internal-Key`: API → reco

## Health
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET | `/health` | publik |

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
| ✅ | GET | `/public/orders/:code` | table token |
| ✅ | POST | `/public/orders/:code/pay` | table token |
| ✅ | GET | `/public/recommendations` | publik |
| ✅ | POST | `/public/recommendation-events` | publik |

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
- Diskon promo selalu 0 sampai S3-08. Setelah commit, `order.created` dipancarkan ke room kasir (S1-08).
- `GET /public/orders/:code` (S1-08) wajib header `X-Table-Token` → `PublicOrderDto`. Hanya pesanan yang dibuat dari meja token tersebut; kode milik meja lain/tidak dikenal → 404 `NOT_FOUND`; token tidak valid → 400 `INVALID_TABLE_TOKEN`.

Catatan implementasi (S3-11, S3-12, S3-17; `fc6dbba`):
- `GET /public/outlets/:slug/menu` sekarang juga mengembalikan `outlet.qrisEnabled` dan `outlet.serviceMode` (`SELF_PICKUP_PAGER` | `TABLE_SERVICE`) agar checkout menyembunyikan QRIS dan halaman status menampilkan instruksi yang sesuai (FR-026).
- Item menu publik memuat `variantGroup`, `variantLabel`, `spiceLevel` (null bila bukan varian). Web mengelompokkan item ber-`variantGroup` sama dalam satu kategori menjadi satu kartu (FR-027). `stock` hanya dikirim bila stok dilacak dan tersisa 1–5 (untuk label "sisa sedikit").
- `POST /public/orders` dengan `paymentMethod = "QRIS"` saat outlet mematikan QRIS → 400 `VALIDATION_ERROR` "Pembayaran QRIS saat ini dinonaktifkan untuk outlet ini. Silakan bayar di kasir."
- Promo dengan kuota (`maxQuantity`) hanya berlaku bila sisa kuota > 0; diskon dihitung paling banyak sebanyak sisa kuota, lalu `usedQuantity` bertambah dalam transaksi yang sama. Kuota dikembalikan saat pesanan dibatalkan kasir atau QRIS kedaluwarsa.
- Setelah pesanan dibuat, notifikasi ke Telegram/webhook WhatsApp dikirim non-blocking (FR-029); bila ada item yang stoknya turun ke ≤ 5, peringatan stok ikut dikirim.

## Pembayaran (FR-005)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | POST | `/public/orders/:code/pay` | table token |
| ✅ | POST | `/payments/midtrans/notification` | signature |

Catatan implementasi (S2-01, S2-02):
- Bila outlet mematikan QRIS (`qrisEnabled = false`, default seed Matwona), `POST /public/orders/:code/pay` → 400 `VALIDATION_ERROR` "Pembayaran QRIS sedang dinonaktifkan oleh outlet." (FR-026).
- `POST /public/orders/:code/pay` (S2-01): Membuat transaksi Snap QRIS dengan batas waktu 15 menit. Wajib header `X-Table-Token` dari meja yang memesan. Mengembalikan `{ orderCode, snapToken, redirectUrl, expiresAt }`. Bila Midtrans API sedang mock/sandbox placeholder, token otomatis disimulasikan agar alur tetap berjalan.
- `POST /payments/midtrans/notification` (S2-02): Webhook publik notifikasi status transaksi Midtrans. Wajib verifikasi signature SHA-512 `SHA512(order_id + status_code + gross_amount + serverKey)`. Idempoten (jika sudah PAID, abaikan). Pada status `settlement` / `capture`, pesanan ditandai `PAID` dan dipancarkan event `payment.updated`. Pada `expire`, `cancel`, atau `deny`, pesanan dibatalkan (`CANCELLED`), stok dikembalikan ke database, dan event `payment.updated` dipancarkan ke kasir dan pelanggan.

## Pesanan (FR-006, FR-008)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET | `/orders` | CASHIER, ADMIN |
| ✅ | GET | `/orders/:id` | CASHIER, ADMIN |
| ✅ | PATCH | `/orders/:id/status` | CASHIER, ADMIN |
| ✅ | POST | `/orders/:id/mark-paid` | CASHIER, ADMIN |
| ✅ | POST | `/orders/:id/cancel` | CASHIER, ADMIN |
| ✅ | GET | `/orders/:id/tickets` | CASHIER, ADMIN |
| 🟨 | POST | `/orders/:id/print` | CASHIER, ADMIN |

Catatan implementasi (S3-13, cetak per station, FR-024):
- `GET /orders/:id/tickets` → `SplitPrintTicket[]`: tiket pertama selalu struk kasir (station `cashier`, berisi harga, subtotal, diskon, total, metode & status bayar, dan baris "Self Pick-up (Ambil Pager)" pada mode `SELF_PICKUP_PAGER`); lalu satu tiket per station lain yang memiliki item (`kitchen`, `bar`, …) tanpa harga, dengan catatan item. Station item = `categories.printerStation`. Station nonaktif dilewati. Setiap tiket punya `plainText` siap cetak dan info printer (`type`, `host`, `port`). Pesanan outlet lain → 404.
- `POST /orders/:id/print` body opsional `{ stationId }` (tanpa body = semua tiket) → `PrintStationResult[]` (`{ stationId, stationName, type, success, message }`). Tipe `NETWORK_LAN` dikirim sebagai ESC/POS lewat TCP ke `host:port` (default 9100, timeout 2,5 dtk); gagal tidak melempar error, cukup `success: false` + pesan. Tipe `BROWSER`/`BLUETOOTH` hanya mengembalikan `success: true` karena dicetak lewat dialog cetak perangkat kasir. `stationId` tidak ada di pesanan → 404.
- ⚠️ Pengiriman TCP dilakukan dari server API, sehingga hanya berfungsi bila API berjalan di jaringan yang sama dengan printer. Setelah deploy ke Cloud Run perlu agen cetak lokal (S3-20). Cetak masih dipicu manual; cetak otomatis menyusul (S3-21).

Catatan implementasi (S1-07):
- Semua endpoint mengembalikan `StaffOrderDto` = `PublicOrderDto` + `{ id, customerPhone, cancelReason, paidAt, updatedAt, allowedNextStatuses, canMarkPaid }`. UI kasir cukup menampilkan tombol sesuai `allowedNextStatuses` (sudah memperhitungkan syarat bayar) dan `canMarkPaid`.
- Hanya pesanan outlet staf dengan `source = DIGITAL`; pesanan outlet lain → 404 `NOT_FOUND`.
- `GET /orders?status=&from=YYYY-MM-DD&to=YYYY-MM-DD&q=` → terbaru dulu, maks. 200. Tanggal dalam WIB, inklusif; tanpa `from`/`to` = hari ini (WIB). `q` mencocokkan sebagian kode pesanan atau label meja persis (tanpa beda huruf besar/kecil). `from > to` → 400.
- `PATCH /orders/:id/status` body `{ status: CONFIRMED|PREPARING|SERVED|COMPLETED }`. Aturan dari `order-status.machine.ts`: transisi tidak sah → 409 `INVALID_STATUS_TRANSITION`; QRIS belum lunas → CONFIRMED atau belum lunas → COMPLETED → 409 `PAYMENT_NOT_COMPLETED`. Kasir pertama yang memproses dicatat di `handledByUserId`.
- `POST /orders/:id/mark-paid` (tanpa body) hanya untuk `paymentMethod = CASHIER`, `paymentStatus = UNPAID`, dan belum batal; selain itu 409 `INVALID_STATUS_TRANSITION`. Mengisi `paymentStatus = PAID`, `paidByUserId`, `paidAt`, dan mencatat baris `payments` (`provider = CASHIER`).
- `POST /orders/:id/cancel` body `{ reason }` (5–200 karakter). Hanya dari NEW/CONFIRMED. Stok item yang dilacak dikembalikan dalam transaksi yang sama lalu cache menu di-invalidate. Status bayar tidak diubah (pembatalan transaksi Midtrans menyusul di S2).
- Perubahan dilakukan bersyarat pada status saat dibaca: bila dua kasir mengubah pesanan yang sama bersamaan, yang kalah mendapat 409 `INVALID_STATUS_TRANSITION` ("muat ulang") dan stok tidak dikembalikan dua kali.
- Setiap perubahan memancarkan `order.updated` (status/batal) atau `payment.updated` (tandai lunas) ke room kasir & pesanan (S1-08).

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
| ✅ | POST | `/menu-items/:id/image` | ADMIN |
| ✅ | DELETE | `/menu-items/:id/image` | ADMIN |

Catatan implementasi (S1-03):
- `GET /public/outlets/:slug/menu` → `PublicMenu`: `{ outlet, categories: [{ id, name, items: [{ id, name, description, price, imageUrl, isAvailable }] }] }`. Hanya kategori aktif yang punya item non-arsip; urut `sortOrder` lalu nama. `isAvailable = false` bila ditandai habis **atau** `stock = 0`. Harga promo menyusul di S3-08.
- Cache Redis key `menu:v1:<slug>`, TTL 60 detik, di-invalidate setiap perubahan kategori/item. Bila Redis mati, API langsung membaca DB (tidak error).
- `GET /categories` → `CategoryDto[]` (dengan `itemCount` item non-arsip). `POST` body `{ name, sortOrder?, isActive? }`. `PUT /categories/:id` parsial. `PATCH /categories/reorder` body `{ ids: [...] }` wajib memuat **semua** kategori outlet; `sortOrder` = posisi. `DELETE` hanya untuk kategori tanpa item (termasuk arsip) → selain itu 409 `CATEGORY_NOT_EMPTY`.
- `GET /menu-items?categoryId=&archived=true|false` (default non-arsip) → `MenuItemDto[]`, termasuk `olseraProductId` & `lastSyncedAt` untuk ikon "tersinkron Olsera".
- `POST /menu-items` body `{ categoryId, name, price, description?, stock?, sku?, isAvailable?, sortOrder? }`; `PUT /menu-items/:id` parsial (field yang tidak dikirim tidak berubah). Harga integer Rupiah ≥ 0. SKU unik per outlet → 409 `SKU_TAKEN`. Kategori outlet lain → 404.
- `PATCH /menu-items/:id/availability` body `{ isAvailable }`; item arsip → 404.
- `DELETE /menu-items/:id` **mengarsipkan** (`isArchived = true`), tidak menghapus permanen; response `MenuItemDto`.
- (S3-12, S3-13) `POST/PUT /categories` menerima `printerStation` (string 1–40, default `"kitchen"`; mengacu ke `id` di `outlet.printerStations`). `POST/PUT /menu-items` menerima `variantGroup` (≤ 80), `variantLabel` (≤ 60), `spiceLevel` (≤ 40), masing-masing boleh `null`.

Catatan implementasi (S2-11, foto menu):
- `POST /menu-items/:id/image` **multipart/form-data**, field `file` (+ header `X-CSRF-Token` seperti mutasi lain). JPG/PNG/WebP maks. 2 MB (`MENU_IMAGE_TYPES`, `MENU_IMAGE_MAX_BYTES` di `shared`); jenis dicek dari **isi file** (magic bytes), bukan dari `Content-Type`. Tanpa file / format lain / > 2 MB → 400 `VALIDATION_ERROR` (`details.field = "file"`); > 4 MB ditolak multer sebelum dibaca → 413 `VALIDATION_ERROR` "Ukuran file terlalu besar.". Item arsip/outlet lain → 404. Response `MenuItemDto` dengan `imageUrl` baru.
- Foto diunggah ke Cloudinary (signed upload REST, kredensial `CLOUDINARY_*` di `.env`) dengan `public_id` tetap `matwona/<outletId>/menu/<itemId>`: unggah ulang **menimpa** foto lama (`overwrite` + `invalidate`), URL memuat nomor versi sehingga cache browser ikut berganti. Foto asli dibatasi 1600 px sisi terpanjang saat disimpan; tampilan memakai transformasi `w_<lebar>,f_auto,q_auto` dari web (`cloudinary-loader.ts`).
- Kredensial kosong atau Cloudinary gagal/timeout 15 detik → 502 `IMAGE_UPLOAD_FAILED`; `imageUrl` lama tidak berubah.
- `DELETE /menu-items/:id/image` → `imageUrl = null` (menu kembali memakai placeholder). File di Cloudinary dibiarkan dan akan ditimpa bila item diberi foto lagi.
- Setiap perubahan foto meng-invalidate cache menu publik.

## Meja & QR (FR-011)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET/POST | `/tables` | ADMIN |
| ✅ | PUT | `/tables/:id` | ADMIN |
| ✅ | POST | `/tables/:id/regenerate-token` | ADMIN |
| ✅ | GET | `/tables/qr.pdf` | ADMIN |

Catatan implementasi (S1-02):
- `GET /tables` → `DiningTableDto[]` (`id, label, capacity, qrToken, isActive`) milik outlet admin, diurutkan natural (`2` sebelum `10`).
- `POST /tables` body `{ label, capacity? }` atau bulk `{ labels: ["A1","A2"] }` (maks. 100) → 201 `DiningTableDto[]`. Label di-trim, maks. 20 karakter, unik per outlet; bentrok → 409 `TABLE_LABEL_TAKEN` (`details.labels`).
- `PUT /tables/:id` body parsial `{ label?, capacity?, isActive? }` (minimal satu field). Meja outlet lain → 404 `NOT_FOUND`. Meja tidak dihapus; nonaktifkan dengan `isActive: false`.

Catatan implementasi (S2-04):
- `POST /tables/:id/regenerate-token` (tanpa body) → `DiningTableDto` dengan `qrToken` baru (acak 128-bit base62). Token lama langsung ditolak `GET /public/tables/:token` (400 `INVALID_TABLE_TOKEN`); QR lama harus dicetak ulang. Pesanan yang sudah ada tidak terpengaruh. Meja outlet lain → 404.
- `GET /tables/qr.pdf?ids=<uuid,uuid>&layout=a6|a4grid` → **file PDF** (`Content-Type: application/pdf`, `Content-Disposition: attachment`), bukan JSON. Default semua meja **aktif** outlet admin, layout `a6` (satu kartu A6 per halaman); `a4grid` = 4 kartu A6 per lembar A4 dengan garis potong. Meja nonaktif & meja outlet lain tidak dicetak; bila tidak ada yang tersisa → 404 `NOT_FOUND` (JSON). Query salah → 400.
- Isi QR: `<PUBLIC_WEB_URL>/m/<slug>/t/<token>`; `PUBLIC_WEB_URL` kosong → origin pertama `WEB_ORIGIN`. Kartu memuat nama Matwona + tagline (logo SVG resmi menyusul), "Meja <label>" (font mengecil otomatis untuk label panjang), "Scan untuk pesan", warna brand.

## Promo & Staf (FR-020, FR-021)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET/POST | `/promos` | ADMIN |
| ✅ | PATCH | `/promos/:id/toggle` | ADMIN |
| ✅ | DELETE | `/promos/:id` | ADMIN |
| ✅ | GET | `/staff` | ADMIN |
| ✅ | POST | `/staff` | ADMIN |
| ✅ | PATCH | `/staff/:id/toggle` | ADMIN |
| ✅ | PATCH | `/staff/:id/password` | ADMIN |
| 🟨 | PATCH | `/staff/:id/pin` | ADMIN |
| ✅ | DELETE | `/staff/:id` | ADMIN |

Catatan implementasi (koreksi 28 Nov):
- **Tidak ada `PUT /promos/:id`** (sebelumnya tercatat ✅). Promo hanya bisa dibuat, diaktif/nonaktifkan (`PATCH /promos/:id/toggle`), dan dihapus. Mengubah isi promo = hapus lalu buat ulang, atau tambahkan endpoint update di PR berikutnya.
- `POST /promos` body `{ title, description?, discountType: "PERCENT"|"NOMINAL", discountValue, minPurchase?, maxQuantity?, startsOn?, endsOn?, menuItemIds? }`. `maxQuantity` ≤ 0 atau kosong = tanpa kuota. Response `PromoDto` memuat `maxQuantity` dan `usedQuantity`. Body belum divalidasi skema Zod.
- `POST /staff` menerima `pin` opsional (4–6 digit). `PATCH /staff/:id/pin` body `{ pin }` (4–6 digit, skema `setStaffPinSchema`) → `StaffDto` dengan `hasPin`. PIN disimpan sebagai hash bcrypt (FR-030).

## Outlet & Operasional (FR-024, FR-026, FR-028, FR-029)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| 🟨 | GET | `/outlet/settings` | ADMIN |
| 🟨 | PATCH | `/outlet/settings` | ADMIN |
| 🟨 | POST | `/outlet/notifications/test` | ADMIN |
| 🟨 | POST | `/outlet/printers/test` | ADMIN |
| 🟨 | GET | `/outlet/cashier-info` | CASHIER, ADMIN |
| 🟨 | POST | `/outlet/stock-reminder/ping` | CASHIER, ADMIN |

Catatan implementasi (S3-11, S3-13, S3-14, S3-15; `fc6dbba`, modul belum punya test):
- `GET /outlet/settings` → `OutletSettingsDto`: `{ id, slug, name, qrisEnabled, serviceMode, stockReminderHours, telegramBotTokenConfigured, telegramBotTokenMasked, telegramChatId, whatsappWebhookUrl, printerStations }`. Bot token Telegram **tidak pernah** dikirim utuh (hanya `abcd••••wxyz`). `printerStations` kosong di DB → daftar default (`cashier` BROWSER, `kitchen` NETWORK_LAN 192.168.1.200:9100, `bar` BLUETOOTH).
- `PATCH /outlet/settings` body parsial (skema `outletSettingsUpdateSchema`, minimal satu field): `qrisEnabled`, `serviceMode`, `stockReminderHours` (jam 0–23, maks. 12; disimpan unik & terurut), `telegramBotToken`, `telegramChatId`, `whatsappWebhookUrl` (string kosong → null), `printerStations` (maks. 10; tiap station `{ id, name, type: "BROWSER"|"NETWORK_LAN"|"BLUETOOTH", host?, port?, brand?, isActive }`). Mengubah `qrisEnabled`/`serviceMode` meng-invalidate cache menu publik.
- `POST /outlet/notifications/test` (tanpa body) → `{ telegram: { configured, sent, message }, whatsapp: { configured, sent, message } }`. Telegram memakai Bot API `sendMessage` (Markdown); WhatsApp = POST JSON ke URL webhook. Timeout 4 dtk per kanal.
- `POST /outlet/printers/test` body `{ stationId }` → `PrintStationResult`. Station LAN dikirimi tiket tes ESC/POS; station browser/Bluetooth hanya dikonfirmasi. Station tidak dikenal → 404.
- `GET /outlet/cashier-info` → `{ qrisEnabled, serviceMode, stockReminderHours, printerStations, lowStockItems: [{ id, name, stock, isAvailable }] }`. `lowStockItems` = item non-arsip yang ditandai habis atau stoknya ≤ 5 (maks. 25). Dipakai dashboard kasir untuk banner pengingat stok.
- `POST /outlet/stock-reminder/ping` (tanpa body) memancarkan `stock.reminder` ke room kasir dan mengembalikan payload yang sama. Belum ada penjadwal di server; banner terjadwal dihitung di browser kasir dari `stockReminderHours` (pengingat server menyusul di S3-23).

## Absensi (FR-030)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| 🟨 | GET | `/attendance/staff-options` | CASHIER, ADMIN |
| ✅ | POST | `/attendance/clock` | CASHIER, ADMIN |
| 🟨 | GET | `/attendance` | ADMIN |

Catatan implementasi (S3-16):
- `GET /attendance/staff-options` → `StaffPinOptionDto[]`: `{ id, name, role, hasPin, clockedIn, lastClockInAt }` untuk staf aktif outlet.
- `POST /attendance/clock` body `{ userId, pin (4–6 digit), action: "IN"|"OUT", note? (≤ 200) }` → `StaffAttendanceDto` `{ id, userId, userName, userRole, clockInAt, clockOutAt, note }`. Staf tidak aktif/outlet lain → 404; PIN belum diatur → 400 `VALIDATION_ERROR`; PIN salah → 401 `UNAUTHORIZED`; `IN` saat masih tercatat masuk atau `OUT` tanpa absen masuk → 400 `VALIDATION_ERROR`.
- ⚠️ Belum ada batas percobaan PIN salah (S3-25).
- `GET /attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=` → `StaffAttendanceDto[]` terbaru dulu, maks. 200. Tanggal WIB inklusif; default 7 hari terakhir.

## Analitik (FR-017…019)
Semua menerima `from`, `to`, `source=all|digital|olsera`.
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| 🟨 | GET | `/analytics/summary` | ADMIN |
| ⬜ | GET | `/analytics/sales-trend` | ADMIN |
| ⬜ | GET | `/analytics/top-items` | ADMIN |
| ⬜ | GET | `/analytics/peak-hours` | ADMIN |
| ⬜ | GET | `/analytics/menu-engineering` | ADMIN |
| ⬜ | GET | `/analytics/recommendation-performance` | ADMIN |
| ⬜ | GET | `/analytics/export.csv` | ADMIN |

Catatan implementasi (S3-05, sebagian):
- `GET /analytics/summary?from=&to=` (default 7 hari terakhir) → `{ from, to, totalRevenue, totalOrders, averageOrderValue, digitalSharePercent, salesTrend: [{ date, revenue, orders }], topItems: [{ id, name, quantity, revenue }], peakHours: [{ hour, orderCount, label }], paymentMethods: [{ method, count, total }] }`. Jam ramai dihitung dalam WIB. Tren, menu terlaris, dan jam ramai sementara digabung di endpoint ini. Filter `source` belum didukung, belum ada perbandingan dengan periode sebelumnya, dan belum ada test.

## Sinkronisasi Olsera (FR-013, FR-014, FR-023)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | POST | `/pos-sync/preview` | ADMIN |
| ✅ | POST | `/pos-sync/apply` | ADMIN |
| ✅ | POST | `/pos-sync/transactions/import` | ADMIN |
| ✅ | GET | `/pos-sync/export-transactions` | ADMIN |
| ✅ | GET | `/pos-sync/mapping` | ADMIN |
| ✅ | PUT | `/pos-sync/mapping` | ADMIN |
| ✅ | GET | `/pos-sync/history` | ADMIN |
| ✅ | GET | `/pos-sync/olsera-test/endpoints` | ADMIN |
| ✅ | POST | `/pos-sync/olsera-test/token` | ADMIN |
| ✅ | POST | `/pos-sync/olsera-test/probe` | ADMIN |

Catatan implementasi (konsol uji Olsera, `fc6dbba`):
- **Status Olsera Open API per 28 Nov 2026:** key sudah didapat dan sudah dicoba, tetapi pemanggilan belum berhasil karena akses masih menunggu approval Olsera. `POS_SYNC_ADAPTER` tetap `olsera-csv`; belum ada `OlseraApiAdapter` (FR-023).
- Konsol uji bersifat **read-only dan stateless**: kredensial dan token tidak disimpan ke DB. `GET .../endpoints` → daftar base URL (production/sandbox) dan endpoint GET yang diizinkan (`global/store`, `collection`, `product`, `productvariantonlysearch`, `order/openorder`, `order/closeorder`, dst.).
- `POST .../token` body `{ environment?, lang?, grantType: "secret_key"|"refresh_token", appId?, secretKey?, refreshToken?, bodyFormat?: "json"|"form" }` → meneruskan ke `POST <base>/api/open-api/v1/<lang>/token` dan mengembalikan `{ ok, statusCode, durationMs, endpoint, tokenType?, expiresIn?, accessToken?, refreshToken?, rawBody }`. Token dikembalikan ke browser admin untuk dipakai di `probe`, tetapi tidak disimpan server.
- `POST .../probe` body `{ environment?, lang?, accessToken, path, query? }`; `path` di luar daftar aman (mis. endpoint mutasi atau pembuatan order) → 400 `VALIDATION_ERROR`. Selalu memakai GET dengan header Bearer, timeout 15 dtk, `per_page` maks. 50.
- ⚠️ Pemanggilan Olsera di sini berada di luar folder `adapters/` (aturan 7 CLAUDE.md); dirapikan di S3-24.

## Rekomendasi admin (FR-019, FR-022)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET | `/recommendations/rules` | ADMIN |
| ✅ | GET | `/recommendations/model-status` | ADMIN |
| ✅ | GET | `/recommendations/suggest` | publik |

## AI service internal (`apps/reco`, port 8000)
| Status | Method | Endpoint | Auth |
|---|---|---|---|
| ✅ | GET | `/health` | publik |
| ⬜ | GET | `/internal/recommend` | X-Internal-Key |
| ⬜ | POST | `/internal/train` | X-Internal-Key / OIDC |

## WebSocket `/realtime`
| Status | Event | Room | Payload |
|---|---|---|---|
| ✅ | `order.created` | `outlet:<id>:cashier` | `StaffOrderDto` |
| ✅ | `order.updated` | `outlet:<id>:cashier` | `{ orderCode, status, order: StaffOrderDto }` |
| ✅ | `order.updated` | `order:<code>` | `{ orderCode, status }` |
| ✅ | `payment.updated` | `outlet:<id>:cashier` | `{ orderCode, paymentStatus, order: StaffOrderDto }` |
| ✅ | `payment.updated` | `order:<code>` | `{ orderCode, paymentStatus }` |
| 🟨 | `stock.reminder` | `outlet:<id>:cashier` | `{ message, lowStockItems: [{ id, name, stock }], triggeredAt }` (FR-028; dipancarkan oleh `POST /outlet/stock-reminder/ping`) |
| ⬜ | `menu.updated` | `outlet:<id>:menu` | `{ menuItemId, isAvailable }` (belum dijadwalkan) |

Catatan implementasi (S1-08):
- URL: `NEXT_PUBLIC_SOCKET_URL` (lokal `http://localhost:4000/realtime`), path Socket.IO default `/socket.io`. Klien hanya **menerima** event; tidak ada event dari klien ke server.
- Room ditentukan server saat handshake (tipe `RealtimeHandshakeAuth` di `shared`):
  - **Kasir/admin**: `io(url, { withCredentials: true })` → cookie `mtw_access` dibaca; klien non-browser boleh `auth: { token }`. Masuk room kasir outletnya.
  - **Pelanggan**: `io(url, { auth: { tableToken, orderCode } })`. Pesanan harus dibuat dari meja token tersebut. Masuk room `order:<code>` saja.
- Handshake gagal → `connect_error` dengan `err.message` (bahasa Indonesia) dan `err.data.code`: `UNAUTHORIZED` (tanpa kredensial / sesi kedaluwarsa), `INVALID_TABLE_TOKEN`, `NOT_FOUND` (pesanan bukan milik meja). Saat `UNAUTHORIZED`, dashboard kasir sebaiknya memanggil `POST /auth/refresh` lalu menyambung ulang.
- Autentikasi hanya diperiksa saat handshake; koneksi yang sudah tersambung tidak diputus saat access token kedaluwarsa (15 menit). Reconnect berikutnya diperiksa ulang.
- Room pelanggan hanya menerima status (tanpa no. HP/nama); data lengkap lewat `GET /public/orders/:code`.
- Event dipancarkan setelah transaksi DB commit; kegagalan emit tidak menggagalkan request HTTP. Klien tetap harus mengambil ulang data setelah reconnect (FR-007/FR-008: polling 10 dtk / refresh saat tersambung).
- Multi-instance (NFR-015): `main.ts` memakai Redis adapter (`REDIS_URL`); bila Redis tidak tersedia saat start, memakai adapter in-memory (cukup untuk satu instance).
