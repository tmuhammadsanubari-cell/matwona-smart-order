import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { ApiSuccess, AuthUser } from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PromosService, type PromoDto } from './promos.service.js';

@Roles('ADMIN')
@Controller('promos')
export class PromosController {
  constructor(@Inject(PromosService) private readonly promosService: PromosService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiSuccess<PromoDto[]>> {
    const list = await this.promosService.list(user.outletId);
    return { success: true, data: list };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description?: string;
      discountType: 'PERCENT' | 'NOMINAL';
      discountValue: number;
      minPurchase?: number;
      startsOn?: string;
      endsOn?: string;
      menuItemIds?: string[];
    },
  ): Promise<ApiSuccess<PromoDto>> {
    const created = await this.promosService.create(user.outletId, body);
    return { success: true, data: created };
  }

  @Patch(':id/toggle')
  async toggle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<PromoDto>> {
    const updated = await this.promosService.toggleActive(user.outletId, id);
    return { success: true, data: updated };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<{ message: string }>> {
    await this.promosService.deletePromo(user.outletId, id);
    return { success: true, data: { message: 'Promo berhasil dihapus.' } };
  }
}
