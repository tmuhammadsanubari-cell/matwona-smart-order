import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode, ORDER_HEADER } from 'shared';
import type { PublicMenu, PublicOrderDto } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { menuCacheKey } from '../src/modules/menu/public-menu.service.js';
import { generateTableToken } from '../src/modules/tables/table-token.js';
import { orderRateLimitKeys } from '../src/modules/orders/orders.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CacheService } from '../src/redis/cache.service.js';
import { RateLimitService } from '../src/redis/rate-limit.service.js';

process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';

const run = randomUUID().slice(0, 8);
const slug = `e2e-${run}-orders`;
const DEFAULT_IP = '203.0.113.10';

let app: INestApplication<App>;
let prisma: PrismaService;
let cache: CacheService;
let rateLimit: RateLimitService;
let outletId: string;
const tables: { id: string; token: string }[] = [];
const items: Record<'tuna' | 'esTeh' | 'ayam' | 'habis', string> = { tuna: '', esTeh: '', ayam: '', habis: '' };

interface OrderOptions {
  token?: string;
  key?: string;
  ip?: string;
}

function postOrder(body: object, { token = tables[0]!.token, key = randomUUID(), ip = DEFAULT_IP }: OrderOptions = {}) {
  const req = request(app.getHttpServer()).post('/api/public/orders').set('X-Forwarded-For', ip);
  if (token) req.set(ORDER_HEADER.TABLE_TOKEN, token);
  if (key) req.set(ORDER_HEADER.IDEMPOTENCY_KEY, key);
  return req.send(body);
}

const body = (lines: object[], extra: object = {}) => ({
  customerName: 'Rina',
  paymentMethod: 'CASHIER',
  items: lines,
  ...extra,
});

const stockOf = async (id: string) => (await prisma.menuItem.findUniqueOrThrow({ where: { id } })).stock;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);
  cache = app.get(CacheService);
  rateLimit = app.get(RateLimitService);

  const outlet = await prisma.outlet.create({
    data: { slug, name: 'Outlet Orders', address: '-', openingHours: {} },
  });
  outletId = outlet.id;
  for (const label of ['A1', 'A2', 'A3']) {
    const t = await prisma.diningTable.create({ data: { outletId, label, qrToken: generateTableToken() } });
    tables.push({ id: t.id, token: t.qrToken });
  }
  const category = await prisma.category.create({ data: { outletId, name: 'Olahan Tuna' } });
  const create = (name: string, price: number, stock: number | null) =>
    prisma.menuItem.create({ data: { outletId, categoryId: category.id, name, price, stock } });
  items.tuna = (await create('Tuna Sambal Matah', 45000, 10)).id;
  items.esTeh = (await create('Es Teh Serai', 8000, null)).id;
  items.ayam = (await create('Ayam Kampung Bakar', 55000, 1)).id;
  items.habis = (await create('Tuna Asap', 40000, 0)).id;
});

beforeEach(async () => {
  for (const t of tables) {
    for (const key of orderRateLimitKeys(t.id, DEFAULT_IP)) await rateLimit.reset(key);
  }
});

afterAll(async () => {
  if (outletId) {
    await prisma.order.deleteMany({ where: { outletId } });
    await prisma.menuItem.deleteMany({ where: { outletId } });
    await prisma.category.deleteMany({ where: { outletId } });
    await prisma.diningTable.deleteMany({ where: { outletId } });
    await prisma.outlet.delete({ where: { id: outletId } });
    await cache.del(menuCacheKey(slug));
  }
  await app?.close();
});

describe('POST /public/orders (e2e) — FR-004, FR-006, NFR-007, NFR-009', () => {
  it('bayar di kasir: 201, harga dihitung ulang dari DB, kode MTW-YYMMDD-XXXX, stok berkurang', async () => {
    const res = await postOrder(
      body(
        [
          { menuItemId: items.tuna, quantity: 2, note: 'sambal dipisah', unitPrice: 1 },
          { menuItemId: items.esTeh, quantity: 1, fromRecommendation: true },
        ],
        { customerPhone: '081234567890', totalAmount: 1 },
      ),
    );
    expect(res.status).toBe(201);
    const order: PublicOrderDto = res.body.data;
    expect(order.orderCode).toMatch(/^MTW-\d{6}-\d{4}$/);
    expect(order).toMatchObject({
      table: 'A1',
      customerName: 'Rina',
      status: 'NEW',
      paymentMethod: 'CASHIER',
      paymentStatus: 'UNPAID',
      subtotalAmount: 98000,
      discountAmount: 0,
      totalAmount: 98000,
    });
    expect(order.items).toHaveLength(2);
    expect(await stockOf(items.tuna)).toBe(8);
    expect(await stockOf(items.esTeh)).toBeNull();

    const saved = await prisma.order.findUniqueOrThrow({ where: { orderCode: order.orderCode }, include: { items: true } });
    expect(saved.customerPhone).toBe('081234567890');
    expect(saved.items.find((i) => i.menuItemId === items.esTeh)?.fromRecommendation).toBe(true);
  });

  it('nomor urut kode pesanan naik per pesanan', async () => {
    const a: PublicOrderDto = (await postOrder(body([{ menuItemId: items.esTeh, quantity: 1 }]))).body.data;
    const b: PublicOrderDto = (await postOrder(body([{ menuItemId: items.esTeh, quantity: 1 }]))).body.data;
    expect(b.orderCode.slice(0, 11)).toBe(a.orderCode.slice(0, 11));
    expect(Number(b.orderCode.slice(11))).toBe(Number(a.orderCode.slice(11)) + 1);
  });

  it('Idempotency-Key sama (double-tap): satu pesanan, request kedua 409 membawa pesanan awal', async () => {
    const key = randomUUID();
    const payload = body([{ menuItemId: items.tuna, quantity: 1 }]);
    const first = await postOrder(payload, { key });
    const second = await postOrder(payload, { key });
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe(ErrorCode.DUPLICATE_REQUEST);
    expect(second.body.error.details.order.orderCode).toBe(first.body.data.orderCode);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);

    // Meja lain memakai key yang sama: ditolak tanpa data pesanan.
    const other = await postOrder(payload, { key, token: tables[1]!.token });
    expect(other.status).toBe(409);
    expect(other.body.error.details).toBeUndefined();
  });

  it('request paralel dengan Idempotency-Key sama hanya membuat satu pesanan', async () => {
    const key = randomUUID();
    const before = await stockOf(items.tuna);
    const results = await Promise.all(
      Array.from({ length: 3 }, () => postOrder(body([{ menuItemId: items.tuna, quantity: 1 }]), { key })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await stockOf(items.tuna)).toBe(before! - 1);
  });

  it('stok terakhir diperebutkan paralel: hanya satu yang berhasil, stok tidak minus', async () => {
    const results = await Promise.all(
      tables.map((t) => postOrder(body([{ menuItemId: items.ayam, quantity: 1 }]), { token: t.token })),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === ErrorCode.ITEM_UNAVAILABLE)).toBe(
      true,
    );
    expect(await stockOf(items.ayam)).toBe(0);
  });

  it('stok habis setelah pesanan langsung terlihat "Habis" di menu (cache di-invalidate)', async () => {
    const menu: PublicMenu = (await request(app.getHttpServer()).get(`/api/public/outlets/${slug}/menu`)).body.data;
    const ayam = menu.categories.flatMap((c) => c.items).find((i) => i.id === items.ayam);
    expect(ayam?.isAvailable).toBe(false);
  });

  it('item habis/nonaktif → 409 ITEM_UNAVAILABLE berisi item bermasalah, stok lain tidak berubah', async () => {
    const before = await stockOf(items.tuna);
    const res = await postOrder(
      body([
        { menuItemId: items.tuna, quantity: 1 },
        { menuItemId: items.habis, quantity: 1 },
      ]),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.ITEM_UNAVAILABLE);
    expect(res.body.error.details.items).toEqual([{ menuItemId: items.habis, name: 'Tuna Asap' }]);
    expect(await stockOf(items.tuna)).toBe(before);
  });

  it('harga berubah sejak keranjang dibuat → 409 PRICE_CHANGED', async () => {
    const res = await postOrder(body([{ menuItemId: items.esTeh, quantity: 1, expectedUnitPrice: 7000 }]));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.PRICE_CHANGED);
    expect(res.body.error.details.items[0]).toMatchObject({ expectedUnitPrice: 7000, unitPrice: 8000 });
  });

  it('QRIS dibuat dengan payment_status PENDING', async () => {
    const res = await postOrder(body([{ menuItemId: items.esTeh, quantity: 1 }], { paymentMethod: 'QRIS' }));
    expect(res.status).toBe(201);
    expect(res.body.data.paymentStatus).toBe('PENDING');
  });

  it('token meja tidak valid, kosong, atau meja nonaktif → 400 INVALID_TABLE_TOKEN', async () => {
    const payload = body([{ menuItemId: items.esTeh, quantity: 1 }]);
    for (const token of ['tidak-valid', '']) {
      const res = await postOrder(payload, { token });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCode.INVALID_TABLE_TOKEN);
    }
    await prisma.diningTable.update({ where: { id: tables[2]!.id }, data: { isActive: false } });
    try {
      const res = await postOrder(payload, { token: tables[2]!.token });
      expect(res.body.error.code).toBe(ErrorCode.INVALID_TABLE_TOKEN);
    } finally {
      await prisma.diningTable.update({ where: { id: tables[2]!.id }, data: { isActive: true } });
    }
  });

  it('validasi input: Idempotency-Key wajib UUID, nama 2–50, HP Indonesia, qty 1–20, catatan ≤ 120', async () => {
    const ok = [{ menuItemId: items.esTeh, quantity: 1 }];
    const cases = [
      postOrder(body(ok), { key: '' }),
      postOrder(body(ok), { key: 'bukan-uuid' }),
      postOrder(body(ok, { customerName: 'R' })),
      postOrder(body(ok, { customerPhone: '12345' })),
      postOrder(body([{ menuItemId: items.esTeh, quantity: 21 }])),
      postOrder(body([{ menuItemId: items.esTeh, quantity: 1, note: 'x'.repeat(121) }])),
      postOrder(body([])),
    ];
    for (const res of await Promise.all(cases)) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it('rate limit: pesanan ke-6 dalam 10 menit dari meja yang sama → 429 RATE_LIMITED', async () => {
    const payload = body([{ menuItemId: items.esTeh, quantity: 1 }]);
    for (let i = 0; i < 5; i++) {
      // IP berbeda agar yang diuji adalah batas per meja.
      expect((await postOrder(payload, { ip: `198.51.100.${i + 1}` })).status).toBe(201);
    }
    const res = await postOrder(payload, { ip: '198.51.100.99' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it('rate limit: pesanan ke-6 dari IP yang sama walau beda meja → 429', async () => {
    const payload = body([{ menuItemId: items.esTeh, quantity: 1 }]);
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    for (const key of orderRateLimitKeys('-', ip)) await rateLimit.reset(key);
    // Disebar ke 3 meja (maks. 2 per meja) agar yang diuji adalah batas per IP.
    for (let i = 0; i < 5; i++) {
      expect((await postOrder(payload, { ip, token: tables[i % 3]!.token })).status).toBe(201);
    }
    const res = await postOrder(payload, { ip, token: tables[2]!.token });
    expect(res.status).toBe(429);
  });
});
