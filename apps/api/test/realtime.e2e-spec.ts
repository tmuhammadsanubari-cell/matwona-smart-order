import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { AUTH_COOKIE, CSRF_HEADER, ErrorCode, ORDER_HEADER, REALTIME_NAMESPACE, SocketEvent } from 'shared';
import type {
  OrderCreatedEvent,
  OrderUpdatedEvent,
  PaymentUpdatedEvent,
  PublicOrderDto,
  RealtimeHandshakeAuth,
} from 'shared';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { orderRateLimitKeys } from '../src/modules/orders/orders.service.js';
import { RedisIoAdapter } from '../src/modules/realtime/redis-io.adapter.js';
import { generateTableToken } from '../src/modules/tables/table-token.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RateLimitService } from '../src/redis/rate-limit.service.js';

process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

/** NFR-002: event diterima ≤ 2 detik. */
const LATENCY_BUDGET_MS = 2000;
const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-${run}-${name}@test.local`;
const IP = '203.0.113.30';

let app: INestApplication<App>;
let prisma: PrismaService;
let rateLimit: RateLimitService;
let baseUrl: string;
const outletIds: string[] = [];
const tables: { id: string; token: string }[] = [];
let esTehId: string;
const sockets: Socket[] = [];

async function login(who: string) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').send({ email: email(who), password: PASSWORD });
  expect(res.status).toBe(200);
  const csrf: string = res.body.data.csrfToken;
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const access = setCookie.find((c) => c.startsWith(`${AUTH_COOKIE.ACCESS}=`))!.split(';')[0]!;
  return {
    cookie: access,
    patch: (url: string, body: object) => agent.patch(url).set(CSRF_HEADER, csrf).send(body),
    post: (url: string, body: object = {}) => agent.post(url).set(CSRF_HEADER, csrf).send(body),
    get: (url: string) => agent.get(url),
  };
}

function connect(options: { cookie?: string; auth?: RealtimeHandshakeAuth }): Socket {
  const socket = io(`${baseUrl}${REALTIME_NAMESPACE}`, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    auth: options.auth ?? {},
    extraHeaders: options.cookie ? { cookie: options.cookie } : {},
  });
  sockets.push(socket);
  return socket;
}

const connected = (socket: Socket) =>
  new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });

const rejected = (socket: Socket) =>
  new Promise<{ message: string; data?: { code: string } }>((resolve, reject) => {
    socket.once('connect', () => reject(new Error('seharusnya ditolak')));
    socket.once('connect_error', (err) => resolve(err as { message: string; data?: { code: string } }));
  });

/** Tunggu event berikutnya, gagal bila lewat anggaran latensi NFR-002. */
function next<T>(socket: Socket, event: string, timeoutMs = LATENCY_BUDGET_MS) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} tidak diterima dalam ${timeoutMs} ms`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Pastikan event TIDAK diterima dalam jeda singkat. */
function none(socket: Socket, event: string, waitMs = 300) {
  return new Promise<void>((resolve, reject) => {
    const handler = () => reject(new Error(`${event} seharusnya tidak diterima`));
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, waitMs);
  });
}

async function placeOrder(tableIndex = 0): Promise<PublicOrderDto> {
  const table = tables[tableIndex]!;
  for (const key of orderRateLimitKeys(table.id, IP)) await rateLimit.reset(key);
  const res = await request(app.getHttpServer())
    .post('/api/public/orders')
    .set('X-Forwarded-For', IP)
    .set(ORDER_HEADER.TABLE_TOKEN, table.token)
    .set(ORDER_HEADER.IDEMPOTENCY_KEY, randomUUID())
    .send({ customerName: 'Rina', customerPhone: '081234567890', paymentMethod: 'CASHIER', items: [{ menuItemId: esTehId, quantity: 1 }] });
  expect(res.status).toBe(201);
  return res.body.data;
}

const orderId = async (code: string) => (await prisma.order.findUniqueOrThrow({ where: { orderCode: code } })).id;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  // Sama dengan main.ts: Redis adapter bila tersedia, in-memory bila tidak.
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  rateLimit = app.get(RateLimitService);

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  for (const key of ['a', 'b']) {
    const outlet = await prisma.outlet.create({
      data: { slug: `e2e-${run}-rt-${key}`, name: `Outlet ${key}`, address: '-', openingHours: {} },
    });
    outletIds.push(outlet.id);
    await prisma.user.create({
      data: { outletId: outlet.id, name: 'Kasir', email: email(`kasir-${key}`), passwordHash, role: 'CASHIER' },
    });
  }
  const outletId = outletIds[0]!;
  for (const label of ['R1', 'R2']) {
    const t = await prisma.diningTable.create({ data: { outletId, label, qrToken: generateTableToken() } });
    tables.push({ id: t.id, token: t.qrToken });
  }
  const category = await prisma.category.create({ data: { outletId, name: 'Minuman' } });
  esTehId = (await prisma.menuItem.create({ data: { outletId, categoryId: category.id, name: 'Es Teh', price: 8000 } })).id;
});

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.disconnect();
});

afterAll(async () => {
  if (outletIds.length) {
    const ids = (await prisma.order.findMany({ where: { outletId: { in: outletIds } } })).map((o) => o.id);
    await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.menuItem.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.category.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.diningTable.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.user.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.outlet.deleteMany({ where: { id: { in: outletIds } } });
  }
  await app?.close();
});

describe('Realtime /realtime (e2e) — FR-007, FR-008, NFR-002', () => {
  it('kasir menerima order.created ≤ 2 detik; kasir outlet lain tidak', async () => {
    const kasir = connect({ cookie: (await login('kasir-a')).cookie });
    const kasirLain = connect({ cookie: (await login('kasir-b')).cookie });
    await Promise.all([connected(kasir), connected(kasirLain)]);

    const created = next<OrderCreatedEvent>(kasir, SocketEvent.ORDER_CREATED);
    const notLeaked = none(kasirLain, SocketEvent.ORDER_CREATED);
    const startedAt = Date.now();
    const order = await placeOrder();
    const event = await created;

    expect(Date.now() - startedAt).toBeLessThan(LATENCY_BUDGET_MS);
    expect(event).toMatchObject({ orderCode: order.orderCode, table: 'R1', status: 'NEW', customerPhone: '081234567890' });
    expect(event.allowedNextStatuses).toEqual(['CONFIRMED', 'CANCELLED']);
    await notLeaked;
  });

  it('handshake ditolak tanpa kredensial, dengan cookie tidak valid, atau pesanan meja lain', async () => {
    expect((await rejected(connect({}))).data?.code).toBe(ErrorCode.UNAUTHORIZED);
    expect((await rejected(connect({ cookie: `${AUTH_COOKIE.ACCESS}=palsu` }))).data?.code).toBe(ErrorCode.UNAUTHORIZED);

    const order = await placeOrder(0);
    const otherTable = connect({ auth: { tableToken: tables[1]!.token, orderCode: order.orderCode } });
    expect((await rejected(otherTable)).data?.code).toBe(ErrorCode.NOT_FOUND);
    const badToken = connect({ auth: { tableToken: 'x', orderCode: order.orderCode } });
    expect((await rejected(badToken)).data?.code).toBe(ErrorCode.INVALID_TABLE_TOKEN);
  });

  it('perubahan status oleh kasir sampai ke pelanggan ≤ 2 detik, tanpa data pribadi', async () => {
    const staff = await login('kasir-a');
    const order = await placeOrder(0);
    const kasir = connect({ cookie: staff.cookie });
    const pelanggan = connect({ auth: { tableToken: tables[0]!.token, orderCode: order.orderCode } });
    // Pelanggan lain (meja berbeda) tidak boleh menerima event pesanan ini.
    const other = await placeOrder(1);
    const pelangganLain = connect({ auth: { tableToken: tables[1]!.token, orderCode: other.orderCode } });
    await Promise.all([connected(kasir), connected(pelanggan), connected(pelangganLain)]);

    const id = await orderId(order.orderCode);
    const toCustomer = next<OrderUpdatedEvent>(pelanggan, SocketEvent.ORDER_UPDATED);
    const toCashier = next<OrderUpdatedEvent>(kasir, SocketEvent.ORDER_UPDATED);
    const notLeaked = none(pelangganLain, SocketEvent.ORDER_UPDATED);
    expect((await staff.patch(`/api/orders/${id}/status`, { status: 'CONFIRMED' })).status).toBe(200);

    expect(await toCustomer).toEqual({ orderCode: order.orderCode, status: 'CONFIRMED' });
    const cashierEvent = await toCashier;
    expect(cashierEvent.order).toMatchObject({ id, status: 'CONFIRMED', allowedNextStatuses: ['PREPARING', 'CANCELLED'] });
    await notLeaked;
  });

  it('tandai lunas memancarkan payment.updated; batal memancarkan order.updated CANCELLED', async () => {
    const staff = await login('kasir-a');
    const paidOrder = await placeOrder(0);
    const cancelledOrder = await placeOrder(1);
    const pelanggan = connect({ auth: { tableToken: tables[0]!.token, orderCode: paidOrder.orderCode } });
    const kasir = connect({ cookie: staff.cookie });
    await Promise.all([connected(pelanggan), connected(kasir)]);

    const payment = next<PaymentUpdatedEvent>(pelanggan, SocketEvent.PAYMENT_UPDATED);
    await staff.post(`/api/orders/${await orderId(paidOrder.orderCode)}/mark-paid`);
    expect(await payment).toEqual({ orderCode: paidOrder.orderCode, paymentStatus: 'PAID' });

    const cancelled = next<OrderUpdatedEvent>(kasir, SocketEvent.ORDER_UPDATED);
    await staff.post(`/api/orders/${await orderId(cancelledOrder.orderCode)}/cancel`, { reason: 'Pelanggan batal pesan' });
    expect(await cancelled).toMatchObject({ orderCode: cancelledOrder.orderCode, status: 'CANCELLED' });
  });

  it('akses pelanggan tidak bisa melihat pesanan meja lain lewat event (tiap koneksi hanya satu room)', async () => {
    const order = await placeOrder(0);
    const pelanggan = connect({ auth: { tableToken: tables[0]!.token, orderCode: order.orderCode } });
    await connected(pelanggan);
    const notCreated = none(pelanggan, SocketEvent.ORDER_CREATED);
    await placeOrder(0);
    await notCreated;
  });
});

describe('GET /public/orders/:code (e2e) — FR-007', () => {
  it('hanya bisa dibuka dengan token meja tempat pesanan dibuat', async () => {
    const order = await placeOrder(0);
    const get = (token?: string) => {
      const req = request(app.getHttpServer()).get(`/api/public/orders/${order.orderCode}`);
      return token ? req.set(ORDER_HEADER.TABLE_TOKEN, token) : req;
    };

    const own = await get(tables[0]!.token);
    expect(own.status).toBe(200);
    expect(own.body.data).toMatchObject({ orderCode: order.orderCode, table: 'R1', status: 'NEW', totalAmount: 8000 });
    expect(own.body.data).not.toHaveProperty('customerPhone');

    const other = await get(tables[1]!.token);
    expect(other.status).toBe(404);
    expect(other.body.error.code).toBe(ErrorCode.NOT_FOUND);

    expect((await get()).body.error.code).toBe(ErrorCode.INVALID_TABLE_TOKEN);
    const unknown = await request(app.getHttpServer())
      .get('/api/public/orders/MTW-000000-0000')
      .set(ORDER_HEADER.TABLE_TOKEN, tables[0]!.token);
    expect(unknown.status).toBe(404);
  });
});
