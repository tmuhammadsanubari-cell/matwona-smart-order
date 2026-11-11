import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PromoDto {
  id: string;
  title: string;
  description: string | null;
  discountType: 'PERCENT' | 'NOMINAL';
  discountValue: number;
  minPurchase: number;
  activeDays: number[];
  startsOn: Date;
  endsOn: Date;
  isActive: boolean;
  itemCount: number;
  createdAt: Date;
}

@Injectable()
export class PromosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(outletId: string): Promise<PromoDto[]> {
    const promos = await this.prisma.promo.findMany({
      where: { outletId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return promos.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minPurchase: p.minPurchase,
      activeDays: p.activeDays,
      startsOn: p.startsOn,
      endsOn: p.endsOn,
      isActive: p.isActive,
      itemCount: p._count.items,
      createdAt: p.createdAt,
    }));
  }

  async create(
    outletId: string,
    data: {
      title: string;
      description?: string;
      discountType: 'PERCENT' | 'NOMINAL';
      discountValue: number;
      minPurchase?: number;
      startsOn?: string;
      endsOn?: string;
      menuItemIds?: string[];
    },
  ): Promise<PromoDto> {
    const startsOn = data.startsOn ? new Date(data.startsOn) : new Date();
    const endsOn = data.endsOn
      ? new Date(data.endsOn)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const promo = await this.prisma.promo.create({
      data: {
        outletId,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        minPurchase: Number(data.minPurchase ?? 0),
        startsOn,
        endsOn,
        isActive: true,
        items: data.menuItemIds?.length
          ? {
              create: data.menuItemIds.map((menuItemId) => ({
                menuItemId,
              })),
            }
          : undefined,
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return {
      id: promo.id,
      title: promo.title,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minPurchase: promo.minPurchase,
      activeDays: promo.activeDays,
      startsOn: promo.startsOn,
      endsOn: promo.endsOn,
      isActive: promo.isActive,
      itemCount: promo._count.items,
      createdAt: promo.createdAt,
    };
  }

  async toggleActive(outletId: string, promoId: string): Promise<PromoDto> {
    const promo = await this.prisma.promo.findFirst({
      where: { id: promoId, outletId },
      include: { _count: { select: { items: true } } },
    });
    if (!promo) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Promo tidak ditemukan.');
    }

    const updated = await this.prisma.promo.update({
      where: { id: promoId },
      data: { isActive: !promo.isActive },
      include: { _count: { select: { items: true } } },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      discountType: updated.discountType,
      discountValue: updated.discountValue,
      minPurchase: updated.minPurchase,
      activeDays: updated.activeDays,
      startsOn: updated.startsOn,
      endsOn: updated.endsOn,
      isActive: updated.isActive,
      itemCount: updated._count.items,
      createdAt: updated.createdAt,
    };
  }

  async deletePromo(outletId: string, promoId: string): Promise<void> {
    const promo = await this.prisma.promo.findFirst({
      where: { id: promoId, outletId },
    });
    if (!promo) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Promo tidak ditemukan.');
    }
    await this.prisma.promo.delete({ where: { id: promoId } });
  }
}
