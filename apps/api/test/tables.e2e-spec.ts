import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { CSRF_HEADER, ErrorCode } from 'shared';
import type { DiningTableDto } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Secret khusus test bila .env / CI belum menyediakannya.
process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-${run}-${name}@test.local`;

let app: INestApplication<App>;
let prisma: PrismaService;
const outletIds: string[] = [];

/** Agent yang sudah login, otomatis mengirim X-CSRF-Token pada request yang mengubah data. */
async function staff(who: string) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').send({ email: email(who), password: PASSWORD });
  expect(res.status).toBe(200);
  const csrf: string = res.body.data.csrfToken;
  return {
    get: (url: string) => agent.get(url),
    post: (url: string, body: object) => agent.post(url).set(CSRF_HEADER, csrf).send(body),
    put: (url: string, body: object) => agent.put(url).set(CSRF_HEADER, csrf).send(body),
  };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  for (const key of ['a', 'b']) {
    const outlet = await prisma.outlet.create({
      data: { slug: `e2e-${run}-${key}`, name: `Outlet ${key}`, address: '-', openingHours: {} },
    });
    outletIds.push(outlet.id);
    await prisma.user.create({
      data: { outletId: outlet.id, name: 'Admin', email: email(`admin-${key}`), passwordHash, role: 'ADMIN' },
    });
  }
  await prisma.user.create({
    data: { outletId: outletIds[0]!, name: 'Kasir', email: email('kasir'), passwordHash, role: 'CASHIER' },
  });
});

afterAll(async () => {
  if (outletIds.length) {
    await prisma.diningTable.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.user.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.outlet.deleteMany({ where: { id: { in: outletIds } } });
  }
  await app?.close();
});

describe('Tables (e2e) — FR-001, FR-011', () => {
  it('admin menambah meja (bulk), lalu QR-nya membuka konteks meja untuk pelanggan', async () => {
    const admin = await staff('admin-a');
    const created = await admin.post('/api/tables', { labels: ['2', '10', '1'] });
    expect(created.status).toBe(201);
    const tables: DiningTableDto[] = created.body.data;
    expect(tables.map((t) => t.label)).toEqual(['1', '2', '10']);

    const list = await admin.get('/api/tables');
    expect(list.body.data.map((t: DiningTableDto) => t.label)).toEqual(['1', '2', '10']);

    const pub = await request(app.getHttpServer()).get(`/api/public/tables/${tables[0]!.qrToken}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data).toEqual({
      table: { id: tables[0]!.id, label: '1' },
      outlet: { id: outletIds[0], slug: `e2e-${run}-a`, name: 'Outlet a' },
    });
  });

  it('token tidak dikenal → 400 INVALID_TABLE_TOKEN', async () => {
    const res = await request(app.getHttpServer()).get('/api/public/tables/0000000000000000000000');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: ErrorCode.INVALID_TABLE_TOKEN,
      message: 'QR tidak dikenali, silakan hubungi kasir.',
    });
  });

  it('meja yang dinonaktifkan tidak bisa dipakai lagi, aktif kembali bisa', async () => {
    const admin = await staff('admin-a');
    const [table] = (await admin.post('/api/tables', { label: 'Teras 1', capacity: 2 })).body.data;

    expect((await admin.put(`/api/tables/${table.id}`, { isActive: false })).body.data.isActive).toBe(false);
    const res = await request(app.getHttpServer()).get(`/api/public/tables/${table.qrToken}`);
    expect(res.status).toBe(400);

    await admin.put(`/api/tables/${table.id}`, { isActive: true });
    expect((await request(app.getHttpServer()).get(`/api/public/tables/${table.qrToken}`)).status).toBe(200);
  });

  it('label meja unik per outlet, tapi boleh sama di outlet lain', async () => {
    const adminA = await staff('admin-a');
    await adminA.post('/api/tables', { label: 'VIP' });
    const dup = await adminA.post('/api/tables', { label: 'VIP' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe(ErrorCode.TABLE_LABEL_TAKEN);

    const adminB = await staff('admin-b');
    expect((await adminB.post('/api/tables', { label: 'VIP' })).status).toBe(201);
  });

  it('admin outlet lain tidak bisa melihat atau mengubah meja outlet ini', async () => {
    const adminA = await staff('admin-a');
    const [table] = (await adminA.post('/api/tables', { label: 'Rahasia' })).body.data;

    const adminB = await staff('admin-b');
    const list = await adminB.get('/api/tables');
    expect(list.body.data.some((t: DiningTableDto) => t.id === table.id)).toBe(false);
    expect((await adminB.put(`/api/tables/${table.id}`, { isActive: false })).status).toBe(404);
  });

  it('kasir tidak boleh mengelola meja → 403', async () => {
    const kasir = await staff('kasir');
    expect((await kasir.get('/api/tables')).status).toBe(403);
    expect((await kasir.post('/api/tables', { label: 'X' })).status).toBe(403);
  });

  it('input tidak valid → 400 VALIDATION_ERROR', async () => {
    const admin = await staff('admin-a');
    expect((await admin.post('/api/tables', { label: '' })).body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect((await admin.put('/api/tables/bukan-uuid', { isActive: false })).status).toBe(400);
  });
});
