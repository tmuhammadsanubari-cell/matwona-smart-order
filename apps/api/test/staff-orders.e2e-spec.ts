import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { CSRF_HEADER, ErrorCode, ORDER_HEADER } from 'shared';
import type { PublicMenu, PublicOrderDto, StaffOrderDto } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { menuCacheKey } from '../src/modules/menu/public-menu.service.js';
import { orderRateLimitKeys } from '../src/modules/orders/orders.service.js';
import { generateTableToken } from '../src/modules/tables/table-token.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CacheService } from '../src/redis/cache.service.js';
import { RateLimitService } from '../src/redis/rate-limit.service.js';

process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-${run}-${name}@test.local`;
const slugA = `e2e-${run}-staff-a`;
const IP = '203.0.113.20';

let app: INestApplication<App>;
let prisma: PrismaService;
let cache: CacheService;
let rateLimit: RateLimitService;
const outletIds: string[] = [];
let table: { id: string; label: string; token: string };
let tunaId: string;
let esTehId: string;

type Staff = Awaited<ReturnType<typeof staff>>;
let kasir: Staff;
let kasirLain: Staff;

async function staff(who: string) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').send({ email: email(who), password: PASSWORD });
  expect(res.status).toBe(200);
  const csrf: string = res.body.data.csrfToken;
  return {
    get: (url: string) => agent.get(url),
    post: (url: string, body: object = {}) => agent.post(url).set(CSRF_HEADER, csrf).send(body),
    patch: (url: string, body: object) => agent.patch(url).set(CSRF_HEADER, csrf).send(body),
    postWithoutCsrf: (url: string) => agent.post(url).send({}),
  };
}

async function placeOrder(paymentMethod: 'CASHIER' | 'QRIS' = 'CASHIER', tunaQty = 2): Promise<StaffOrderDto> {
  for (const key of orderRateLimitKeys(table.id, IP)) await rateLimit.reset(key);
  const res = await request(app.getHttpServer())
    .post('/api/public/orders')
    .set('X-Forwarded-For', IP)
    .set(ORDER_HEADER.TABLE_TOKEN, table.token)
    .set(ORDER_HEADER.IDEMPOTENCY_KEY, randomUUID())
    .send({
      customerName: 'Rina',
      paymentMethod,
      items: [
        { menuItemId: tunaId, quantity: tunaQty },
        { menuItemId: esTehId, quantity: 1 },
      ],
    });
  expect(res.status).toBe(201);
  const order: PublicOrderDto = res.body.data;
  const found = await prisma.order.findUniqueOrThrow({ where: { orderCode: order.orderCode } });
  return (await kasir.get(`/api/orders/${found.id}`)).body.data;
}

const stockOfTuna = async () => (await prisma.menuItem.findUniqueOrThrow({ where: { id: tunaId } })).stock;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);
  cache = app.get(CacheService);
  rateLimit = app.get(RateLimitService);

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  for (const key of ['a', 'b']) {
    const outlet = await prisma.outlet.create({
      data: { slug: `e2e-${run}-staff-${key}`, name: `Outlet ${key}`, address: '-', openingHours: {} },
    });
    outletIds.push(outlet.id);
    await prisma.user.create({
      data: { outletId: outlet.id, name: 'Kasir', email: email(`kasir-${key}`), passwordHash, role: 'CASHIER' },
    });
  }
  const outletId = outletIds[0]!;
  await prisma.user.create({
    data: { outletId, name: 'Kasir 2', email: email('kasir-a2'), passwordHash, role: 'CASHIER' },
  });
  const t = await prisma.diningTable.create({ data: { outletId, label: 'B7', qrToken: generateTableToken() } });
  table = { id: t.id, label: t.label, token: t.qrToken };
  const category = await prisma.category.create({ data: { outletId, name: 'Olahan Tuna' } });
  tunaId = (await prisma.menuItem.create({
    data: { outletId, categoryId: category.id, name: 'Tuna Sambal Matah', price: 45000, stock: 2 },
  })).id;
  esTehId = (await prisma.menuItem.create({
    data: { outletId, categoryId: category.id, name: 'Es Teh Serai', price: 8000 },
  })).id;

  kasir = await staff('kasir-a');
  kasirLain = await staff('kasir-b');
});

beforeEach(async () => {
  await prisma.menuItem.update({ where: { id: tunaId }, data: { stock: 2 } });
});

afterAll(async () => {
  if (outletIds.length) {
    const orders = { orderId: { in: (await prisma.order.findMany({ where: { outletId: { in: outletIds } } })).map((o) => o.id) } };
    await prisma.payment.deleteMany({ where: orders });
    await prisma.order.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.menuItem.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.category.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.diningTable.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.user.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.outlet.deleteMany({ where: { id: { in: outletIds } } });
    await cache.del(menuCacheKey(slugA));
  }
  await app?.close();
});

describe('Pesanan kasir (e2e) — FR-006, FR-008', () => {
  it('wajib login; kasir outlet lain tidak bisa melihat pesanan', async () => {
    const order = await placeOrder();
    expect((await request(app.getHttpServer()).get('/api/orders')).status).toBe(401);
    expect((await kasirLain.get(`/api/orders/${order.id}`)).status).toBe(404);
    const list: StaffOrderDto[] = (await kasirLain.get('/api/orders')).body.data;
    expect(list.find((o) => o.id === order.id)).toBeUndefined();
  });

  it('daftar pesanan hari ini dengan filter status & pencarian kode/meja', async () => {
    const order = await placeOrder();
    expect(order).toMatchObject({
      table: 'B7',
      status: 'NEW',
      paymentStatus: 'UNPAID',
      allowedNextStatuses: ['CONFIRMED', 'CANCELLED'],
      canMarkPaid: true,
    });

    const ids = async (query: string) =>
      ((await kasir.get(`/api/orders${query}`)).body.data as StaffOrderDto[]).map((o) => o.id);
    expect(await ids('')).toContain(order.id);
    expect(await ids('?q=b7')).toContain(order.id);
    expect(await ids(`?q=${order.orderCode.slice(-4)}`)).toContain(order.id);
    expect(await ids('?status=NEW')).toContain(order.id);
    expect(await ids('?status=COMPLETED')).not.toContain(order.id);
    expect(await ids('?from=2020-01-01&to=2020-01-02')).toEqual([]);

    const bad = await kasir.get('/api/orders?from=2026-11-05&to=2026-11-01');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('alur bayar di kasir: konfirmasi → disiapkan → disajikan → (wajib lunas) → selesai', async () => {
    const order = await placeOrder();
    const status = (s: string) => kasir.patch(`/api/orders/${order.id}/status`, { status: s });

    expect((await status('CONFIRMED')).body.data.status).toBe('CONFIRMED');
    expect((await status('PREPARING')).body.data.allowedNextStatuses).toEqual(['SERVED']);
    expect((await status('SERVED')).status).toBe(200);

    const notPaid = await status('COMPLETED');
    expect(notPaid.status).toBe(409);
    expect(notPaid.body.error.code).toBe(ErrorCode.PAYMENT_NOT_COMPLETED);

    const paid = await kasir.post(`/api/orders/${order.id}/mark-paid`);
    expect(paid.status).toBe(201);
    expect(paid.body.data).toMatchObject({ paymentStatus: 'PAID', canMarkPaid: false });
    expect(paid.body.data.paidAt).not.toBeNull();

    expect((await status('COMPLETED')).body.data.status).toBe('COMPLETED');

    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(saved.paidByUserId).not.toBeNull();
    expect(saved.handledByUserId).toBe(saved.paidByUserId);
    expect(saved.payments).toMatchObject([{ provider: 'CASHIER', status: 'PAID', amount: order.totalAmount }]);

    const again = await kasir.post(`/api/orders/${order.id}/mark-paid`);
    expect(again.body.error.code).toBe(ErrorCode.INVALID_STATUS_TRANSITION);
  });

  it('transisi tidak sah → 409 INVALID_STATUS_TRANSITION; CANCELLED hanya lewat /cancel', async () => {
    const order = await placeOrder();
    const skip = await kasir.patch(`/api/orders/${order.id}/status`, { status: 'SERVED' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe(ErrorCode.INVALID_STATUS_TRANSITION);

    const viaPatch = await kasir.patch(`/api/orders/${order.id}/status`, { status: 'CANCELLED' });
    expect(viaPatch.status).toBe(400);
  });

  it('QRIS belum lunas tidak bisa diproses dan tidak bisa ditandai lunas di kasir', async () => {
    const order = await placeOrder('QRIS');
    expect(order).toMatchObject({ paymentStatus: 'PENDING', allowedNextStatuses: ['CANCELLED'], canMarkPaid: false });

    const confirm = await kasir.patch(`/api/orders/${order.id}/status`, { status: 'CONFIRMED' });
    expect(confirm.status).toBe(409);
    expect(confirm.body.error.code).toBe(ErrorCode.PAYMENT_NOT_COMPLETED);
    expect((await kasir.post(`/api/orders/${order.id}/mark-paid`)).status).toBe(409);
  });

  it('batal: alasan min. 5 karakter, stok kembali, menu kembali tersedia', async () => {
    const order = await placeOrder('CASHIER', 2);
    expect(await stockOfTuna()).toBe(0);
    const menuTuna = async () =>
      ((await request(app.getHttpServer()).get(`/api/public/outlets/${slugA}/menu`)).body.data as PublicMenu).categories
        .flatMap((c) => c.items)
        .find((i) => i.id === tunaId);
    expect((await menuTuna())?.isAvailable).toBe(false);

    const short = await kasir.post(`/api/orders/${order.id}/cancel`, { reason: 'ga' });
    expect(short.status).toBe(400);

    const res = await kasir.post(`/api/orders/${order.id}/cancel`, { reason: 'Pelanggan batal pesan' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Pelanggan batal pesan', allowedNextStatuses: [] });
    expect(await stockOfTuna()).toBe(2);
    expect((await menuTuna())?.isAvailable).toBe(true);

    const twice = await kasir.post(`/api/orders/${order.id}/cancel`, { reason: 'Pelanggan batal pesan' });
    expect(twice.status).toBe(409);
    expect(await stockOfTuna()).toBe(2);
  });

  it('dua kasir membatalkan bersamaan: hanya satu berhasil, stok dikembalikan sekali', async () => {
    const order = await placeOrder('CASHIER', 2);
    const kasir2 = await staff('kasir-a2');
    const results = await Promise.all([
      kasir.post(`/api/orders/${order.id}/cancel`, { reason: 'Batal oleh kasir 1' }),
      kasir2.post(`/api/orders/${order.id}/cancel`, { reason: 'Batal oleh kasir 2' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOfTuna()).toBe(2);
  });

  it('pesanan yang sedang disiapkan tidak bisa dibatalkan', async () => {
    const order = await placeOrder();
    await kasir.patch(`/api/orders/${order.id}/status`, { status: 'CONFIRMED' });
    await kasir.patch(`/api/orders/${order.id}/status`, { status: 'PREPARING' });
    const res = await kasir.post(`/api/orders/${order.id}/cancel`, { reason: 'Pelanggan batal pesan' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.INVALID_STATUS_TRANSITION);
  });

  it('request yang mengubah data tanpa X-CSRF-Token ditolak 403', async () => {
    const order = await placeOrder();
    const res = await kasir.postWithoutCsrf(`/api/orders/${order.id}/mark-paid`);
    expect(res.status).toBe(403);
  });
});
