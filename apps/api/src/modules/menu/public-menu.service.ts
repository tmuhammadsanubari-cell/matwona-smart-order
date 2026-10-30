import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { PublicMenu } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheService } from '../../redis/cache.service.js';

/** TTL cache menu publik (PRD 2.2.1). Perubahan admin meng-invalidate lebih cepat. */
export const MENU_CACHE_TTL_SECONDS = 60;
const SLUG_PATTERN = /^[a-z0-9-]{1,50}$/;

export const menuCacheKey = (slug: string) => `menu:v1:${slug}`;

/** Menu digital pelanggan (FR-002) dengan cache Redis. */
@Injectable()
export class PublicMenuService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async getMenu(slug: string): Promise<PublicMenu> {
    if (!SLUG_PATTERN.test(slug)) throw this.outletNotFound();

    const cached = await this.cache.getJson<PublicMenu>(menuCacheKey(slug));
    if (cached) return cached;

    const outlet = await this.prisma.outlet.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
    if (!outlet) throw this.outletNotFound();

    const categories = await this.prisma.category.findMany({
      where: { outletId: outlet.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        menuItems: {
          where: { isArchived: false },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    const menu: PublicMenu = {
      outlet,
      categories: categories
        .filter((c) => c.menuItems.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: c.menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            // Habis bila ditandai manual atau stok terlacak sudah 0 (FR-002).
            isAvailable: item.isAvailable && item.stock !== 0,
          })),
        })),
    };

    await this.cache.setJson(menuCacheKey(slug), menu, MENU_CACHE_TTL_SECONDS);
    return menu;
  }

  /**
   * Hapus cache menu outlet. Wajib dipanggil setiap ada perubahan kategori/item,
   * stok (pesanan, S1-06) dan setelah sinkron Olsera (S2-07).
   */
  async invalidate(outletId: string): Promise<void> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { slug: true },
    });
    if (outlet) await this.cache.del(menuCacheKey(outlet.slug));
  }

  private outletNotFound() {
    return new AppException(ErrorCode.NOT_FOUND, 'Outlet tidak ditemukan.');
  }
}
