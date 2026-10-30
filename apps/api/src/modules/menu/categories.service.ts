import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { CategoryDto, CategoryInput, CategoryUpdateInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from './public-menu.service.js';

/** Kategori menu (FR-010). Semua query difilter outletId (NFR-016). */
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PublicMenuService) private readonly publicMenu: PublicMenuService,
  ) {}

  async list(outletId: string): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { outletId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { menuItems: { where: { isArchived: false } } } } },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      itemCount: c._count.menuItems,
    }));
  }

  async create(outletId: string, input: CategoryInput): Promise<CategoryDto> {
    const category = await this.prisma.category.create({ data: { ...input, outletId } });
    await this.publicMenu.invalidate(outletId);
    return { ...this.toDto(category), itemCount: 0 };
  }

  async update(outletId: string, id: string, input: CategoryUpdateInput): Promise<CategoryDto> {
    await this.findOrThrow(outletId, id);
    await this.prisma.category.update({ where: { id }, data: input });
    await this.publicMenu.invalidate(outletId);
    return (await this.list(outletId)).find((c) => c.id === id)!;
  }

  /** Urutan baru = posisi id. Harus memuat semua kategori outlet agar urutan tidak bentrok. */
  async reorder(outletId: string, ids: string[]): Promise<CategoryDto[]> {
    const existing = await this.prisma.category.findMany({ where: { outletId }, select: { id: true } });
    const known = new Set(existing.map((c) => c.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Urutan harus memuat semua kategori outlet tepat satu kali.',
      );
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.category.update({ where: { id }, data: { sortOrder } })),
    );
    await this.publicMenu.invalidate(outletId);
    return this.list(outletId);
  }

  /** Hanya kategori tanpa item (termasuk arsip) yang boleh dihapus, agar histori pesanan utuh. */
  async remove(outletId: string, id: string): Promise<void> {
    await this.findOrThrow(outletId, id);
    const itemCount = await this.prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      throw new AppException(
        ErrorCode.CATEGORY_NOT_EMPTY,
        'Kategori masih berisi menu. Pindahkan atau arsipkan menu terlebih dahulu, atau nonaktifkan kategori.',
        { itemCount },
      );
    }
    await this.prisma.category.delete({ where: { id } });
    await this.publicMenu.invalidate(outletId);
  }

  private async findOrThrow(outletId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, outletId } });
    if (!category) throw new AppException(ErrorCode.NOT_FOUND, 'Kategori tidak ditemukan.');
    return category;
  }

  private toDto(c: { id: string; name: string; sortOrder: number; isActive: boolean }) {
    return { id: c.id, name: c.name, sortOrder: c.sortOrder, isActive: c.isActive };
  }
}
