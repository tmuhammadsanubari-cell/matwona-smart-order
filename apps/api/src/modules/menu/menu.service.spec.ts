import {
  categoryReorderSchema,
  MENU_IMAGE_MAX_BYTES,
  categoryUpdateSchema,
  ErrorCode,
  menuItemListQuerySchema,
  menuItemSchema,
  menuItemUpdateSchema,
} from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { MenuItem } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CacheService } from '../../redis/cache.service.js';
import { CategoriesService } from './categories.service.js';
import { MenuItemsService, menuImagePublicId } from './menu-items.service.js';
import { MENU_CACHE_TTL_SECONDS, menuCacheKey, PublicMenuService } from './public-menu.service.js';

const OUTLET = { id: 'outlet-1', slug: 'matwona', name: 'Matwona' };

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    outletId: OUTLET.id,
    categoryId: 'cat-1',
    name: 'Tuna Sambal Matah',
    description: null,
    price: 45000,
    imageUrl: null,
    stock: null,
    sku: 'TN-SBM',
    olseraProductId: null,
    isAvailable: true,
    isArchived: false,
    sortOrder: 0,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup() {
  const prisma = {
    outlet: { findUnique: vi.fn() },
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
  const cache = { getJson: vi.fn().mockResolvedValue(null), setJson: vi.fn(), del: vi.fn() };
  const db = prisma as unknown as PrismaService;
  const publicMenu = new PublicMenuService(db, cache as unknown as CacheService);
  const images = { upload: vi.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/demo/image/upload/v2/menu.jpg' }) };
  return {
    prisma,
    cache,
    publicMenu,
    images,
    categories: new CategoriesService(db, publicMenu),
    items: new MenuItemsService(db, publicMenu, images),
  };
}

async function expectAppError(promise: Promise<unknown>, code: ErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  return error as AppException;
}

describe('PublicMenuService.getMenu (FR-002)', () => {
  it('cache miss: baca DB, susun per kategori, simpan ke Redis 60 detik', async () => {
    const { publicMenu, prisma, cache } = setup();
    prisma.outlet.findUnique.mockResolvedValue(OUTLET);
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Olahan Tuna', menuItems: [makeItem()] },
      { id: 'cat-2', name: 'Kosong', menuItems: [] },
    ]);

    const menu = await publicMenu.getMenu('matwona');

    expect(menu).toEqual({
      outlet: OUTLET,
      categories: [
        {
          id: 'cat-1',
          name: 'Olahan Tuna',
          items: [
            { id: 'item-1', name: 'Tuna Sambal Matah', description: null, price: 45000, imageUrl: null, isAvailable: true },
          ],
        },
      ],
    });
    // Hanya kategori aktif & item non-arsip, terurut sortOrder.
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { outletId: OUTLET.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { menuItems: expect.objectContaining({ where: { isArchived: false } }) },
      }),
    );
    expect(cache.setJson).toHaveBeenCalledWith(menuCacheKey('matwona'), menu, MENU_CACHE_TTL_SECONDS);
    expect(MENU_CACHE_TTL_SECONDS).toBe(60);
  });

  it('item ditandai habis atau stok 0 tampil isAvailable=false; stok null (tidak dilacak) tetap tersedia', async () => {
    const { publicMenu, prisma } = setup();
    prisma.outlet.findUnique.mockResolvedValue(OUTLET);
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Olahan Tuna',
        menuItems: [
          makeItem({ id: 'off', isAvailable: false }),
          makeItem({ id: 'zero', stock: 0 }),
          makeItem({ id: 'some', stock: 3 }),
          makeItem({ id: 'untracked', stock: null }),
        ],
      },
    ]);
    const { categories } = await publicMenu.getMenu('matwona');
    expect(Object.fromEntries(categories[0]!.items.map((i) => [i.id, i.isAvailable]))).toEqual({
      off: false,
      zero: false,
      some: true,
      untracked: true,
    });
  });

  it('cache hit: tidak menyentuh database', async () => {
    const { publicMenu, prisma, cache } = setup();
    const cached = { outlet: OUTLET, categories: [] };
    cache.getJson.mockResolvedValue(cached);
    await expect(publicMenu.getMenu('matwona')).resolves.toBe(cached);
    expect(prisma.outlet.findUnique).not.toHaveBeenCalled();
  });

  it('outlet tidak ada atau slug tidak valid → NOT_FOUND', async () => {
    const { publicMenu, prisma, cache } = setup();
    prisma.outlet.findUnique.mockResolvedValue(null);
    await expectAppError(publicMenu.getMenu('tidak-ada'), ErrorCode.NOT_FOUND);
    await expectAppError(publicMenu.getMenu('../MATWONA'), ErrorCode.NOT_FOUND);
    expect(cache.getJson).toHaveBeenCalledTimes(1);
  });

  it('invalidate menghapus cache berdasarkan slug outlet', async () => {
    const { publicMenu, prisma, cache } = setup();
    prisma.outlet.findUnique.mockResolvedValue({ slug: 'matwona' });
    await publicMenu.invalidate(OUTLET.id);
    expect(cache.del).toHaveBeenCalledWith('menu:v1:matwona');
  });
});

describe('CategoriesService (FR-010)', () => {
  it('reorder menyimpan sortOrder sesuai posisi dan meng-invalidate cache', async () => {
    const { categories, prisma, cache } = setup();
    prisma.category.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([]);
    prisma.outlet.findUnique.mockResolvedValue({ slug: 'matwona' });

    await categories.reorder(OUTLET.id, ['b', 'a']);
    expect(prisma.category.update).toHaveBeenNthCalledWith(1, { where: { id: 'b' }, data: { sortOrder: 0 } });
    expect(prisma.category.update).toHaveBeenNthCalledWith(2, { where: { id: 'a' }, data: { sortOrder: 1 } });
    expect(cache.del).toHaveBeenCalled();
  });

  it('reorder menolak daftar yang tidak lengkap atau berisi kategori outlet lain', async () => {
    const { categories, prisma } = setup();
    prisma.category.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expectAppError(categories.reorder(OUTLET.id, ['a']), ErrorCode.VALIDATION_ERROR);
    await expectAppError(categories.reorder(OUTLET.id, ['a', 'x']), ErrorCode.VALIDATION_ERROR);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('kategori yang masih punya item (termasuk arsip) tidak bisa dihapus', async () => {
    const { categories, prisma } = setup();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.menuItem.count.mockResolvedValue(2);
    await expectAppError(categories.remove(OUTLET.id, 'cat-1'), ErrorCode.CATEGORY_NOT_EMPTY);
    expect(prisma.menuItem.count).toHaveBeenCalledWith({ where: { categoryId: 'cat-1' } });
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('kategori kosong bisa dihapus', async () => {
    const { categories, prisma } = setup();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.menuItem.count.mockResolvedValue(0);
    await categories.remove(OUTLET.id, 'cat-1');
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
  });

  it('kategori outlet lain → NOT_FOUND', async () => {
    const { categories, prisma } = setup();
    prisma.category.findFirst.mockResolvedValue(null);
    await expectAppError(categories.update(OUTLET.id, 'cat-x', { name: 'X' }), ErrorCode.NOT_FOUND);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({ where: { id: 'cat-x', outletId: OUTLET.id } });
  });
});

describe('MenuItemsService (FR-010)', () => {
  it('membuat item di outlet staf dan meng-invalidate cache menu', async () => {
    const { items, prisma, cache } = setup();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.menuItem.create.mockImplementation(async ({ data }) => makeItem(data));
    prisma.outlet.findUnique.mockResolvedValue({ slug: 'matwona' });

    const input = menuItemSchema.parse({ categoryId: crypto.randomUUID(), name: 'Es Teh', price: 8000 });
    const dto = await items.create(OUTLET.id, input);
    expect(prisma.menuItem.create.mock.calls[0]![0].data).toMatchObject({ outletId: OUTLET.id, price: 8000 });
    expect(dto).toMatchObject({ name: 'Es Teh', price: 8000, isAvailable: true, isArchived: false });
    expect(cache.del).toHaveBeenCalledWith('menu:v1:matwona');
  });

  it('kategori milik outlet lain ditolak', async () => {
    const { items, prisma } = setup();
    prisma.category.findFirst.mockResolvedValue(null);
    await expectAppError(
      items.create(OUTLET.id, { categoryId: 'cat-x', name: 'X', price: 1, isAvailable: true, sortOrder: 0 }),
      ErrorCode.NOT_FOUND,
    );
    expect(prisma.menuItem.create).not.toHaveBeenCalled();
  });

  it('SKU bentrok → SKU_TAKEN', async () => {
    const { items, prisma } = setup();
    prisma.menuItem.findFirst.mockResolvedValue(makeItem());
    prisma.menuItem.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expectAppError(items.update(OUTLET.id, 'item-1', { sku: 'TN-BKK' }), ErrorCode.SKU_TAKEN);
  });

  it('toggle availability tersimpan; item arsip tidak bisa di-toggle', async () => {
    const { items, prisma } = setup();
    prisma.menuItem.findFirst.mockResolvedValueOnce(makeItem());
    prisma.menuItem.update.mockResolvedValue(makeItem({ isAvailable: false }));
    await expect(items.setAvailability(OUTLET.id, 'item-1', false)).resolves.toMatchObject({ isAvailable: false });
    expect(prisma.menuItem.update).toHaveBeenCalledWith({ where: { id: 'item-1' }, data: { isAvailable: false } });

    prisma.menuItem.findFirst.mockResolvedValueOnce(makeItem({ isArchived: true }));
    await expectAppError(items.setAvailability(OUTLET.id, 'item-1', true), ErrorCode.NOT_FOUND);
  });

  it('DELETE mengarsipkan, tidak menghapus permanen (aturan bisnis #6)', async () => {
    const { items, prisma } = setup();
    prisma.menuItem.findFirst.mockResolvedValue(makeItem());
    prisma.menuItem.update.mockResolvedValue(makeItem({ isArchived: true }));
    await expect(items.archive(OUTLET.id, 'item-1')).resolves.toMatchObject({ isArchived: true });
    expect(prisma.menuItem.update).toHaveBeenCalledWith({ where: { id: 'item-1' }, data: { isArchived: true } });
    expect(prisma.menuItem).not.toHaveProperty('delete');
  });

  it('daftar default hanya item non-arsip; ?archived=true untuk arsip', async () => {
    const { items, prisma } = setup();
    prisma.menuItem.findMany.mockResolvedValue([]);
    await items.list(OUTLET.id, menuItemListQuerySchema.parse({}));
    await items.list(OUTLET.id, menuItemListQuerySchema.parse({ archived: 'true' }));
    expect(prisma.menuItem.findMany.mock.calls[0]![0].where).toEqual({ outletId: OUTLET.id, isArchived: false });
    expect(prisma.menuItem.findMany.mock.calls[1]![0].where).toEqual({ outletId: OUTLET.id, isArchived: true });
  });
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe('MenuItemsService foto menu (FR-010, S2-11)', () => {
  it('foto valid: diunggah dengan id tetap per item, imageUrl disimpan, cache menu di-invalidate', async () => {
    const { prisma, cache, images, items } = setup();
    prisma.menuItem.findFirst.mockResolvedValue(makeItem());
    prisma.outlet.findUnique.mockResolvedValue(OUTLET);
    prisma.menuItem.update.mockImplementation(async ({ data }) => makeItem(data));

    const dto = await items.setImage(OUTLET.id, 'item-1', { buffer: PNG, size: PNG.length });

    expect(images.upload).toHaveBeenCalledWith({ buffer: PNG, type: 'image/png' }, menuImagePublicId(OUTLET.id, 'item-1'));
    expect(prisma.menuItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { imageUrl: 'https://res.cloudinary.com/demo/image/upload/v2/menu.jpg' },
    });
    expect(dto.imageUrl).toBe('https://res.cloudinary.com/demo/image/upload/v2/menu.jpg');
    expect(cache.del).toHaveBeenCalledWith(menuCacheKey(OUTLET.slug));
  });

  it('tanpa file, > 2 MB, atau bukan JPG/PNG/WebP → VALIDATION_ERROR tanpa memanggil Cloudinary', async () => {
    const { prisma, images, items } = setup();
    prisma.menuItem.findFirst.mockResolvedValue(makeItem());

    const empty = await expectAppError(items.setImage(OUTLET.id, 'item-1', undefined), ErrorCode.VALIDATION_ERROR);
    expect(empty.message).toBe('Pilih foto yang akan diunggah.');
    const big = await expectAppError(
      items.setImage(OUTLET.id, 'item-1', { buffer: PNG, size: MENU_IMAGE_MAX_BYTES + 1 }),
      ErrorCode.VALIDATION_ERROR,
    );
    expect(big.message).toBe('Ukuran foto maksimal 2 MB.');
    // File teks yang mengaku gambar: jenis dicek dari isi file.
    const fake = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const wrong = await expectAppError(items.setImage(OUTLET.id, 'item-1', { buffer: fake, size: fake.length }), ErrorCode.VALIDATION_ERROR);
    expect(wrong.message).toBe('Format foto harus JPG, PNG, atau WebP.');
    expect(images.upload).not.toHaveBeenCalled();
  });

  it('item arsip atau outlet lain → NOT_FOUND; gagal unggah tidak mengubah imageUrl', async () => {
    const { prisma, images, items } = setup();
    prisma.menuItem.findFirst.mockResolvedValueOnce(makeItem({ isArchived: true })).mockResolvedValueOnce(null);
    await expectAppError(items.setImage(OUTLET.id, 'item-1', { buffer: PNG, size: PNG.length }), ErrorCode.NOT_FOUND);
    await expectAppError(items.setImage(OUTLET.id, 'item-x', { buffer: PNG, size: PNG.length }), ErrorCode.NOT_FOUND);

    prisma.menuItem.findFirst.mockResolvedValue(makeItem());
    images.upload.mockRejectedValue(new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, 'Foto belum bisa diunggah.'));
    await expectAppError(items.setImage(OUTLET.id, 'item-1', { buffer: PNG, size: PNG.length }), ErrorCode.IMAGE_UPLOAD_FAILED);
    expect(prisma.menuItem.update).not.toHaveBeenCalled();
  });

  it('hapus foto: imageUrl jadi null dan cache menu di-invalidate', async () => {
    const { prisma, cache, items } = setup();
    prisma.menuItem.findFirst.mockResolvedValue(makeItem({ imageUrl: 'https://res.cloudinary.com/x.jpg' }));
    prisma.outlet.findUnique.mockResolvedValue(OUTLET);
    prisma.menuItem.update.mockImplementation(async ({ data }) => makeItem(data));
    expect((await items.removeImage(OUTLET.id, 'item-1')).imageUrl).toBeNull();
    expect(cache.del).toHaveBeenCalledWith(menuCacheKey(OUTLET.slug));
  });
});

describe('skema menu (shared)', () => {
  it('nama wajib & harga bilangan bulat ≥ 0 Rupiah', () => {
    const base = { categoryId: crypto.randomUUID(), name: 'Es Teh', price: 8000 };
    expect(menuItemSchema.safeParse(base).success).toBe(true);
    expect(menuItemSchema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...base, price: 8000.5 }).success).toBe(false);
  });

  it('update parsial tidak mengisi default (tidak mereset isAvailable/sortOrder)', () => {
    expect(menuItemUpdateSchema.parse({ price: 9000 })).toEqual({ price: 9000 });
    expect(categoryUpdateSchema.parse({ name: 'Minuman' })).toEqual({ name: 'Minuman' });
    expect(menuItemUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('reorder menolak id ganda', () => {
    const id = crypto.randomUUID();
    expect(categoryReorderSchema.safeParse({ ids: [id, id] }).success).toBe(false);
  });
});
