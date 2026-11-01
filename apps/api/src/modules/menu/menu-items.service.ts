import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, MENU_IMAGE_MAX_BYTES } from 'shared';
import type { MenuItemDto, MenuItemInput, MenuItemListQuery, MenuItemUpdateInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { MenuItem } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { detectImageType, IMAGE_STORAGE, type ImageStorage } from './image-storage.js';
import { PublicMenuService } from './public-menu.service.js';

/** File dari multipart (FileInterceptor/multer); cukup field yang dipakai. */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/** Id foto di Cloudinary: satu foto per item, unggah ulang menimpa. */
export const menuImagePublicId = (outletId: string, itemId: string) => `matwona/${outletId}/menu/${itemId}`;

export const toMenuItemDto = (item: MenuItem): MenuItemDto => ({
  id: item.id,
  categoryId: item.categoryId,
  name: item.name,
  description: item.description,
  price: item.price,
  imageUrl: item.imageUrl,
  stock: item.stock,
  sku: item.sku,
  isAvailable: item.isAvailable,
  isArchived: item.isArchived,
  sortOrder: item.sortOrder,
  olseraProductId: item.olseraProductId,
  lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null,
});

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

/**
 * Item menu (FR-010). Item tidak pernah dihapus permanen, hanya diarsipkan (aturan bisnis #6).
 * Semua query difilter outletId (NFR-016).
 */
@Injectable()
export class MenuItemsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PublicMenuService) private readonly publicMenu: PublicMenuService,
    @Inject(IMAGE_STORAGE) private readonly images: ImageStorage,
  ) {}

  async list(outletId: string, query: MenuItemListQuery): Promise<MenuItemDto[]> {
    const items = await this.prisma.menuItem.findMany({
      where: {
        outletId,
        isArchived: query.archived,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map(toMenuItemDto);
  }

  async create(outletId: string, input: MenuItemInput): Promise<MenuItemDto> {
    await this.ensureCategory(outletId, input.categoryId);
    const item = await this.withSkuCheck(input.sku, () =>
      this.prisma.menuItem.create({ data: { ...input, outletId } }),
    );
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(item);
  }

  async update(outletId: string, id: string, input: MenuItemUpdateInput): Promise<MenuItemDto> {
    await this.findOrThrow(outletId, id);
    if (input.categoryId) await this.ensureCategory(outletId, input.categoryId);
    const item = await this.withSkuCheck(input.sku, () =>
      this.prisma.menuItem.update({ where: { id }, data: input }),
    );
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(item);
  }

  /** Toggle tersedia/habis, boleh oleh kasir (FR-010). */
  async setAvailability(outletId: string, id: string, isAvailable: boolean): Promise<MenuItemDto> {
    const item = await this.findOrThrow(outletId, id);
    if (item.isArchived) throw this.notFound();
    const updated = await this.prisma.menuItem.update({ where: { id }, data: { isAvailable } });
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(updated);
  }

  /** DELETE /menu-items/:id → arsip (`isArchived = true`), idempoten. */
  async archive(outletId: string, id: string): Promise<MenuItemDto> {
    await this.findOrThrow(outletId, id);
    const item = await this.prisma.menuItem.update({ where: { id }, data: { isArchived: true } });
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(item);
  }

  /**
   * POST /menu-items/:id/image (FR-010 AC): JPG/PNG/WebP maks. 2 MB, jenis dicek dari isi file.
   * Foto disimpan di Cloudinary dengan id tetap per item lalu `imageUrl` diperbarui.
   */
  async setImage(outletId: string, id: string, file: UploadedImage | undefined): Promise<MenuItemDto> {
    const item = await this.findOrThrow(outletId, id);
    if (item.isArchived) throw this.notFound();
    if (!file || file.size === 0) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Pilih foto yang akan diunggah.', { field: 'file' });
    }
    if (file.size > MENU_IMAGE_MAX_BYTES) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Ukuran foto maksimal 2 MB.', { field: 'file' });
    }
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Format foto harus JPG, PNG, atau WebP.', { field: 'file' });
    }

    const { url } = await this.images.upload({ buffer: file.buffer, type }, menuImagePublicId(outletId, id));
    const updated = await this.prisma.menuItem.update({ where: { id }, data: { imageUrl: url } });
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(updated);
  }

  /** DELETE /menu-items/:id/image: menu kembali memakai placeholder. File di Cloudinary dibiarkan (ditimpa saat unggah ulang). */
  async removeImage(outletId: string, id: string): Promise<MenuItemDto> {
    const item = await this.findOrThrow(outletId, id);
    if (item.isArchived) throw this.notFound();
    const updated = await this.prisma.menuItem.update({ where: { id }, data: { imageUrl: null } });
    await this.publicMenu.invalidate(outletId);
    return toMenuItemDto(updated);
  }

  private async findOrThrow(outletId: string, id: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id, outletId } });
    if (!item) throw this.notFound();
    return item;
  }

  private async ensureCategory(outletId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, outletId },
      select: { id: true },
    });
    if (!category) throw new AppException(ErrorCode.NOT_FOUND, 'Kategori tidak ditemukan.');
  }

  /** SKU unik per outlet (constraint DB); ubah pelanggaran jadi SKU_TAKEN. */
  private async withSkuCheck<T>(sku: string | null | undefined, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (e) {
      if (isUniqueViolation(e) && sku) {
        throw new AppException(ErrorCode.SKU_TAKEN, `SKU ${sku} sudah dipakai menu lain.`, { sku });
      }
      throw e;
    }
  }

  private notFound() {
    return new AppException(ErrorCode.NOT_FOUND, 'Menu tidak ditemukan.');
  }
}
