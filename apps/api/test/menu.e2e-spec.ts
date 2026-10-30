import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { CSRF_HEADER, ErrorCode } from 'shared';
import type { CategoryDto, MenuItemDto, PublicMenu } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { menuCacheKey } from '../src/modules/menu/public-menu.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CacheService } from '../src/redis/cache.service.js';

// Secret khusus test bila .env / CI belum menyediakannya.
process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-${run}-${name}@test.local`;
const slugA = `e2e-${run}-a`;

let app: INestApplication<App>;
let prisma: PrismaService;
let cache: CacheService;
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
    patch: (url: string, body: object) => agent.patch(url).set(CSRF_HEADER, csrf).send(body),
    delete: (url: string) => agent.delete(url).set(CSRF_HEADER, csrf),
  };
}

const publicMenu = async (slug = slugA): Promise<PublicMenu> => {
  const res = await request(app.getHttpServer()).get(`/api/public/outlets/${slug}/menu`);
  expect(res.status).toBe(200);
  return res.body.data;
};

const findItem = (menu: PublicMenu, id: string) =>
  menu.categories.flatMap((c) => c.items).find((i) => i.id === id);

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);
  cache = app.get(CacheService);

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
    await prisma.menuItem.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.category.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.user.deleteMany({ where: { outletId: { in: outletIds } } });
    await prisma.outlet.deleteMany({ where: { id: { in: outletIds } } });
    await cache.del(menuCacheKey(slugA));
  }
  await app?.close();
});

describe('Menu (e2e) — FR-002, FR-010', () => {
  let tuna: CategoryDto;
  let drinks: CategoryDto;
  let sambalMatah: MenuItemDto;
  let esTeh: MenuItemDto;

  it('admin membuat kategori & item, menu pelanggan menampilkannya terurut', async () => {
    const admin = await staff('admin-a');
    tuna = (await admin.post('/api/categories', { name: 'Olahan Tuna', sortOrder: 0 })).body.data;
    drinks = (await admin.post('/api/categories', { name: 'Minuman', sortOrder: 1 })).body.data;
    await admin.post('/api/categories', { name: 'Kosong', sortOrder: 2 });

    const created = await admin.post('/api/menu-items', {
      categoryId: tuna.id,
      name: 'Tuna Sambal Matah',
      price: 45000,
      sku: `SKU-${run}`,
      sortOrder: 1,
    });
    expect(created.status).toBe(201);
    sambalMatah = created.body.data;
    await admin.post('/api/menu-items', { categoryId: tuna.id, name: 'Tuna Bakar', price: 42000, sortOrder: 0 });
    esTeh = (await admin.post('/api/menu-items', { categoryId: drinks.id, name: 'Es Teh', price: 8000 })).body.data;

    const menu = await publicMenu();
    expect(menu.outlet.slug).toBe(slugA);
    // Kategori tanpa item tidak ditampilkan.
    expect(menu.categories.map((c) => c.name)).toEqual(['Olahan Tuna', 'Minuman']);
    expect(menu.categories[0]!.items.map((i) => i.name)).toEqual(['Tuna Bakar', 'Tuna Sambal Matah']);
    expect(findItem(menu, sambalMatah.id)).toEqual({
      id: sambalMatah.id,
      name: 'Tuna Sambal Matah',
      description: null,
      price: 45000,
      imageUrl: null,
      isAvailable: true,
    });
    // Response tersimpan di Redis.
    expect(await cache.getJson(menuCacheKey(slugA))).toEqual(menu);
  });

  it('kasir menandai "Habis" → langsung terlihat di menu pelanggan (cache di-invalidate)', async () => {
    await publicMenu(); // pastikan cache terisi
    const kasir = await staff('kasir');
    const res = await kasir.patch(`/api/menu-items/${esTeh.id}/availability`, { isAvailable: false });
    expect(res.status).toBe(200);
    expect(findItem(await publicMenu(), esTeh.id)?.isAvailable).toBe(false);

    await kasir.patch(`/api/menu-items/${esTeh.id}/availability`, { isAvailable: true });
    expect(findItem(await publicMenu(), esTeh.id)?.isAvailable).toBe(true);
  });

  it('stok 0 tampil sebagai Habis', async () => {
    const admin = await staff('admin-a');
    await admin.put(`/api/menu-items/${esTeh.id}`, { stock: 0 });
    expect(findItem(await publicMenu(), esTeh.id)?.isAvailable).toBe(false);
    await admin.put(`/api/menu-items/${esTeh.id}`, { stock: null });
  });

  it('PUT parsial tidak mereset field lain', async () => {
    const admin = await staff('admin-a');
    const res = await admin.put(`/api/menu-items/${sambalMatah.id}`, { price: 47000 });
    expect(res.body.data).toMatchObject({ price: 47000, sortOrder: 1, isAvailable: true, sku: `SKU-${run}` });
  });

  it('item diarsipkan: hilang dari menu pelanggan, tetap ada di DB & daftar arsip', async () => {
    const admin = await staff('admin-a');
    const res = await admin.delete(`/api/menu-items/${esTeh.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isArchived).toBe(true);

    expect(findItem(await publicMenu(), esTeh.id)).toBeUndefined();
    expect(await prisma.menuItem.findUnique({ where: { id: esTeh.id } })).not.toBeNull();
    const archived = await admin.get('/api/menu-items?archived=true');
    expect(archived.body.data.map((i: MenuItemDto) => i.id)).toContain(esTeh.id);
    const active = await admin.get('/api/menu-items');
    expect(active.body.data.map((i: MenuItemDto) => i.id)).not.toContain(esTeh.id);
  });

  it('kategori berisi item (termasuk arsip) tidak bisa dihapus; kategori kosong bisa', async () => {
    const admin = await staff('admin-a');
    const res = await admin.delete(`/api/categories/${drinks.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.CATEGORY_NOT_EMPTY);

    const list: CategoryDto[] = (await admin.get('/api/categories')).body.data;
    const empty = list.find((c) => c.name === 'Kosong')!;
    expect(empty.itemCount).toBe(0);
    expect((await admin.delete(`/api/categories/${empty.id}`)).status).toBe(200);
  });

  it('reorder kategori mengubah urutan di menu pelanggan', async () => {
    const admin = await staff('admin-a');
    await admin.post('/api/menu-items', { categoryId: drinks.id, name: 'Es Jeruk', price: 10000 });
    const res = await admin.patch('/api/categories/reorder', { ids: [drinks.id, tuna.id] });
    expect(res.status).toBe(200);
    expect((await publicMenu()).categories.map((c) => c.name)).toEqual(['Minuman', 'Olahan Tuna']);
  });

  it('kategori nonaktif tidak tampil di menu pelanggan', async () => {
    const admin = await staff('admin-a');
    await admin.put(`/api/categories/${drinks.id}`, { isActive: false });
    expect((await publicMenu()).categories.map((c) => c.name)).toEqual(['Olahan Tuna']);
    await admin.put(`/api/categories/${drinks.id}`, { isActive: true });
  });

  it('validasi: nama wajib, harga integer ≥ 0, SKU unik per outlet', async () => {
    const admin = await staff('admin-a');
    const base = { categoryId: tuna.id, name: 'Baru', price: 1000 };
    expect((await admin.post('/api/menu-items', { ...base, name: '' })).body.error.code).toBe(
      ErrorCode.VALIDATION_ERROR,
    );
    expect((await admin.post('/api/menu-items', { ...base, price: -5 })).status).toBe(400);
    expect((await admin.post('/api/menu-items', { ...base, price: 1000.5 })).status).toBe(400);
    const dup = await admin.post('/api/menu-items', { ...base, sku: `SKU-${run}` });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe(ErrorCode.SKU_TAKEN);
  });

  it('kasir boleh melihat & toggle, tapi tidak boleh membuat/ubah/arsip menu atau kategori', async () => {
    const kasir = await staff('kasir');
    expect((await kasir.get('/api/menu-items')).status).toBe(200);
    expect((await kasir.post('/api/menu-items', { categoryId: tuna.id, name: 'X', price: 1 })).status).toBe(403);
    expect((await kasir.put(`/api/menu-items/${sambalMatah.id}`, { price: 1 })).status).toBe(403);
    expect((await kasir.delete(`/api/menu-items/${sambalMatah.id}`)).status).toBe(403);
    expect((await kasir.get('/api/categories')).status).toBe(403);
  });

  it('admin outlet lain tidak bisa melihat atau mengubah menu outlet ini', async () => {
    const adminB = await staff('admin-b');
    const list = await adminB.get('/api/menu-items');
    expect(list.body.data).toEqual([]);
    expect((await adminB.patch(`/api/menu-items/${sambalMatah.id}/availability`, { isAvailable: false })).status).toBe(
      404,
    );
    expect((await adminB.post('/api/menu-items', { categoryId: tuna.id, name: 'X', price: 1 })).status).toBe(404);
  });

  it('outlet tidak dikenal → 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/public/outlets/tidak-ada-outlet/menu');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);
  });
});
