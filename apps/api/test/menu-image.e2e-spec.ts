import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { CSRF_HEADER, ErrorCode, MENU_IMAGE_MAX_BYTES } from 'shared';
import type { PublicMenu } from 'shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { AppException } from '../src/common/app.exception.js';
import { IMAGE_STORAGE, type ImageStorage } from '../src/modules/menu/image-storage.js';
import { menuCacheKey } from '../src/modules/menu/public-menu.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CacheService } from '../src/redis/cache.service.js';

// Secret khusus test bila .env / CI belum menyediakannya.
process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
process.env.BCRYPT_COST ??= '4';

const PASSWORD = 'Rahasia123!';
const run = randomUUID().slice(0, 8);
const email = (name: string) => `e2e-img-${run}-${name}@test.local`;
const slugA = `e2e-img-${run}-a`;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

/** Penyimpanan palsu: tidak memanggil Cloudinary, URL meniru format secure_url. */
const storage = {
  upload: vi.fn<ImageStorage['upload']>(async (_file, publicId) => ({
    url: `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.png`,
  })),
};

let app: INestApplication<App>;
let prisma: PrismaService;
let cache: CacheService;
const outletIds: string[] = [];
let itemA: string;
let itemB: string;

async function staff(who: string) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').send({ email: email(who), password: PASSWORD });
  expect(res.status).toBe(200);
  const csrf: string = res.body.data.csrfToken;
  return {
    upload: (id: string, buffer: Buffer, filename = 'foto.png') =>
      agent.post(`/api/menu-items/${id}/image`).set(CSRF_HEADER, csrf).attach('file', buffer, filename),
    removeImage: (id: string) => agent.delete(`/api/menu-items/${id}/image`).set(CSRF_HEADER, csrf),
  };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IMAGE_STORAGE)
    .useValue(storage)
    .compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  prisma = app.get(PrismaService);
  cache = app.get(CacheService);

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const items: string[] = [];
  for (const key of ['a', 'b']) {
    const outlet = await prisma.outlet.create({
      data: { slug: `e2e-img-${run}-${key}`, name: `Outlet ${key}`, address: '-', openingHours: {} },
    });
    outletIds.push(outlet.id);
    await prisma.user.create({
      data: { outletId: outlet.id, name: 'Admin', email: email(`admin-${key}`), passwordHash, role: 'ADMIN' },
    });
    const category = await prisma.category.create({ data: { outletId: outlet.id, name: 'Olahan Tuna' } });
    const item = await prisma.menuItem.create({
      data: { outletId: outlet.id, categoryId: category.id, name: 'Tuna Sambal Matah', price: 45000 },
    });
    items.push(item.id);
  }
  [itemA, itemB] = items as [string, string];
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

describe('Foto menu (e2e) — FR-010, S2-11', () => {
  it('admin mengunggah PNG → imageUrl tersimpan dan langsung tampil di menu pelanggan', async () => {
    const admin = await staff('admin-a');
    const res = await admin.upload(itemA, PNG);
    expect(res.status).toBe(200);
    expect(res.body.data.imageUrl).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/menu\/.+\.png$/);
    expect(storage.upload).toHaveBeenCalledWith(
      { buffer: expect.any(Buffer), type: 'image/png' },
      `matwona/${outletIds[0]}/menu/${itemA}`,
    );

    const menu: PublicMenu = (await request(app.getHttpServer()).get(`/api/public/outlets/${slugA}/menu`)).body.data;
    expect(menu.categories[0]!.items[0]!.imageUrl).toBe(res.body.data.imageUrl);
  });

  it('bukan gambar (walau bernama .png) → 400; > 2 MB → 400; jauh lebih besar → 413', async () => {
    const admin = await staff('admin-a');
    storage.upload.mockClear();

    const text = await admin.upload(itemA, Buffer.from('bukan gambar'), 'palsu.png');
    expect(text.status).toBe(400);
    expect(text.body.error).toMatchObject({ code: ErrorCode.VALIDATION_ERROR, message: 'Format foto harus JPG, PNG, atau WebP.' });

    const big = await admin.upload(itemA, Buffer.concat([PNG, Buffer.alloc(MENU_IMAGE_MAX_BYTES)]));
    expect(big.status).toBe(400);
    expect(big.body.error.message).toBe('Ukuran foto maksimal 2 MB.');

    const huge = await admin.upload(itemA, Buffer.concat([PNG, Buffer.alloc(MENU_IMAGE_MAX_BYTES * 2)]));
    expect(huge.status).toBe(413);
    expect(huge.body.error).toMatchObject({ code: ErrorCode.VALIDATION_ERROR, message: 'Ukuran file terlalu besar.' });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('kasir tidak boleh mengunggah; item outlet lain → 404', async () => {
    expect((await (await staff('kasir')).upload(itemA, PNG)).status).toBe(403);
    expect((await (await staff('admin-a')).upload(itemB, PNG)).status).toBe(404);
  });

  it('Cloudinary gagal → 502 IMAGE_UPLOAD_FAILED dan foto lama tidak berubah', async () => {
    const before = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemA } });
    storage.upload.mockRejectedValueOnce(new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, 'Foto belum bisa diunggah.'));
    const res = await (await staff('admin-a')).upload(itemA, PNG);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe(ErrorCode.IMAGE_UPLOAD_FAILED);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: itemA } })).imageUrl).toBe(before.imageUrl);
  });

  it('hapus foto → imageUrl null', async () => {
    const res = await (await staff('admin-a')).removeImage(itemA);
    expect(res.status).toBe(200);
    expect(res.body.data.imageUrl).toBeNull();
  });
});
