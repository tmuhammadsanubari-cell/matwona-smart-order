import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Controller, Get, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { AUTH_COOKIE, CSRF_HEADER, ErrorCode } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { Roles } from '../src/common/decorators/auth.decorators.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Secret khusus test bila .env / CI belum menyediakannya.
process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

/** Endpoint uji untuk memeriksa RBAC & CSRF dari ujung ke ujung (FR-009). */
@Controller('e2e-probe')
class ProbeController {
  @Roles('ADMIN')
  @Get('admin')
  adminOnly() {
    return { success: true, data: 'admin' };
  }

  @Roles('CASHIER', 'ADMIN')
  @Post('staff')
  staffWrite() {
    return { success: true, data: 'ok' };
  }
}

const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-${run}-${name}@test.local`;

let app: INestApplication<App>;
let prisma: PrismaService;
let outletId: string;

const cookieValue = (res: request.Response, name: string) => {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return raw.find((c) => c.startsWith(`${name}=`));
};

async function login(agent: request.Agent | ReturnType<typeof request>, who: string, password = PASSWORD) {
  const target = 'post' in agent ? agent : request(app.getHttpServer());
  return target.post('/api/auth/login').send({ email: email(who), password });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);

  const outlet = await prisma.outlet.create({
    data: { slug: `e2e-${run}`, name: 'Outlet E2E', address: '-', openingHours: {} },
  });
  outletId = outlet.id;
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  await prisma.user.createMany({
    data: [
      { outletId, name: 'Admin E2E', email: email('admin'), passwordHash, role: 'ADMIN' },
      { outletId, name: 'Kasir E2E', email: email('kasir'), passwordHash, role: 'CASHIER' },
      { outletId, name: 'Kasir Kunci', email: email('lock'), passwordHash, role: 'CASHIER' },
      { outletId, name: 'Kasir Off', email: email('off'), passwordHash, role: 'CASHIER', isActive: false },
      { outletId, name: 'Kasir Resign', email: email('resign'), passwordHash, role: 'CASHIER' },
    ],
  });
});

afterAll(async () => {
  if (outletId) {
    await prisma.user.deleteMany({ where: { outletId } });
    await prisma.outlet.delete({ where: { id: outletId } });
  }
  await app?.close();
});

describe('Auth (e2e) — FR-009', () => {
  it('/auth/me tanpa login → 401 UNAUTHORIZED', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: ErrorCode.UNAUTHORIZED } });
  });

  it('login menyetel cookie HttpOnly + SameSite=Lax dan /auth/me mengembalikan staf', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await login(agent, 'kasir');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: email('kasir'), role: 'CASHIER', outletId });
    expect(res.body.data.csrfToken).toEqual(expect.any(String));
    expect(cookieValue(res, AUTH_COOKIE.ACCESS)).toMatch(/HttpOnly/);
    expect(cookieValue(res, AUTH_COOKIE.ACCESS)).toMatch(/SameSite=Lax/);
    expect(cookieValue(res, AUTH_COOKIE.REFRESH)).toMatch(/Path=\/api\/auth.*HttpOnly/);
    expect(cookieValue(res, AUTH_COOKIE.CSRF)).not.toMatch(/HttpOnly/);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email('kasir'));
  });

  it('kasir yang mengakses endpoint ADMIN → 403, admin → 200', async () => {
    const kasir = request.agent(app.getHttpServer());
    await login(kasir, 'kasir');
    const denied = await kasir.get('/api/e2e-probe/admin');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe(ErrorCode.FORBIDDEN);

    const admin = request.agent(app.getHttpServer());
    await login(admin, 'admin');
    expect((await admin.get('/api/e2e-probe/admin')).status).toBe(200);
  });

  it('request staf yang mengubah data wajib X-CSRF-Token yang cocok', async () => {
    const agent = request.agent(app.getHttpServer());
    const { body } = await login(agent, 'kasir');

    expect((await agent.post('/api/e2e-probe/staff')).status).toBe(403);
    expect((await agent.post('/api/e2e-probe/staff').set(CSRF_HEADER, 'salah')).status).toBe(403);
    expect((await agent.post('/api/e2e-probe/staff').set(CSRF_HEADER, body.data.csrfToken)).status).toBe(201);
  });

  it('refresh merotasi token; memakai ulang token lama → 401 dan semua sesi dicabut', async () => {
    const agent = request.agent(app.getHttpServer());
    const first = await login(agent, 'kasir');
    const oldRefresh = cookieValue(first, AUTH_COOKIE.REFRESH)!.split(';')[0]!;

    const rotated = await agent.post('/api/auth/refresh');
    expect(rotated.status).toBe(200);
    expect(cookieValue(rotated, AUTH_COOKIE.REFRESH)!.split(';')[0]).not.toBe(oldRefresh);

    const reuse = await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', oldRefresh);
    expect(reuse.status).toBe(401);
    expect((await agent.post('/api/auth/refresh')).status).toBe(401);
  });

  it('logout menghapus cookie dan mencabut refresh token di server', async () => {
    const agent = request.agent(app.getHttpServer());
    const first = await login(agent, 'kasir');
    const refresh = cookieValue(first, AUTH_COOKIE.REFRESH)!.split(';')[0]!;

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    for (const name of Object.values(AUTH_COOKIE)) {
      expect(cookieValue(res, name)).toMatch(/Expires=Thu, 01 Jan 1970/);
    }
    const again = await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', refresh);
    expect(again.status).toBe(401);
  });

  it('gagal login 5 kali berturut-turut mengunci akun 15 menit', async () => {
    const server = request(app.getHttpServer());
    for (let i = 1; i <= 4; i++) {
      expect((await login(server, 'lock', 'password-salah')).status).toBe(401);
    }
    const fifth = await login(server, 'lock', 'password-salah');
    expect(fifth.status).toBe(423);
    expect(fifth.body.error.code).toBe(ErrorCode.ACCOUNT_LOCKED);

    const correct = await login(server, 'lock');
    expect(correct.status).toBe(423);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: email('lock') } });
    const minutes = (user.lockedUntil!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it('akun nonaktif tidak bisa login', async () => {
    const res = await login(request(app.getHttpServer()), 'off');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('dinonaktifkan');
  });

  it('akun yang dinonaktifkan setelah login langsung kehilangan akses dan refresh token-nya dicabut', async () => {
    const agent = request.agent(app.getHttpServer());
    await login(agent, 'resign');
    await prisma.user.update({ where: { email: email('resign') }, data: { isActive: false } });

    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await agent.post('/api/auth/refresh')).status).toBe(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: email('resign') } });
    const active = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(active).toBe(0);
  });
});
