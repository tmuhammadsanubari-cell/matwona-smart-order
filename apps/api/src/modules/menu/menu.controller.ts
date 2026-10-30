import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  categoryReorderSchema,
  categorySchema,
  categoryUpdateSchema,
  menuAvailabilitySchema,
  menuItemListQuerySchema,
  menuItemSchema,
  menuItemUpdateSchema,
} from 'shared';
import type {
  ApiSuccess,
  AuthUser,
  CategoryDto,
  CategoryInput,
  CategoryReorderInput,
  CategoryUpdateInput,
  MenuAvailabilityInput,
  MenuItemDto,
  MenuItemInput,
  MenuItemListQuery,
  MenuItemUpdateInput,
  PublicMenu,
} from 'shared';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { uuidParam, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CategoriesService } from './categories.service.js';
import { MenuItemsService } from './menu-items.service.js';
import { PublicMenuService } from './public-menu.service.js';

/** Menu digital pelanggan (FR-002). */
@Public()
@Controller('public/outlets')
export class PublicMenuController {
  constructor(@Inject(PublicMenuService) private readonly menu: PublicMenuService) {}

  @Get(':slug/menu')
  async getMenu(@Param('slug') slug: string): Promise<ApiSuccess<PublicMenu>> {
    return { success: true, data: await this.menu.getMenu(slug) };
  }
}

/** Kelola kategori oleh admin (FR-010). */
@Roles('ADMIN')
@Controller('categories')
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiSuccess<CategoryDto[]>> {
    return { success: true, data: await this.categories.list(user.outletId) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(categorySchema)) body: CategoryInput,
  ): Promise<ApiSuccess<CategoryDto>> {
    return { success: true, data: await this.categories.create(user.outletId, body) };
  }

  @Patch('reorder')
  async reorder(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(categoryReorderSchema)) body: CategoryReorderInput,
  ): Promise<ApiSuccess<CategoryDto[]>> {
    return { success: true, data: await this.categories.reorder(user.outletId, body.ids) };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema)) body: CategoryUpdateInput,
  ): Promise<ApiSuccess<CategoryDto>> {
    return { success: true, data: await this.categories.update(user.outletId, id, body) };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
  ): Promise<ApiSuccess<null>> {
    await this.categories.remove(user.outletId, id);
    return { success: true, data: null };
  }
}

/** Kelola item menu (FR-010). Kasir hanya boleh melihat & toggle tersedia/habis. */
@Controller('menu-items')
export class MenuItemsController {
  constructor(@Inject(MenuItemsService) private readonly items: MenuItemsService) {}

  @Roles('CASHIER', 'ADMIN')
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(menuItemListQuerySchema)) query: MenuItemListQuery,
  ): Promise<ApiSuccess<MenuItemDto[]>> {
    return { success: true, data: await this.items.list(user.outletId, query) };
  }

  @Roles('ADMIN')
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(menuItemSchema)) body: MenuItemInput,
  ): Promise<ApiSuccess<MenuItemDto>> {
    return { success: true, data: await this.items.create(user.outletId, body) };
  }

  @Roles('ADMIN')
  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(menuItemUpdateSchema)) body: MenuItemUpdateInput,
  ): Promise<ApiSuccess<MenuItemDto>> {
    return { success: true, data: await this.items.update(user.outletId, id, body) };
  }

  @Roles('CASHIER', 'ADMIN')
  @Patch(':id/availability')
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(menuAvailabilitySchema)) body: MenuAvailabilityInput,
  ): Promise<ApiSuccess<MenuItemDto>> {
    return {
      success: true,
      data: await this.items.setAvailability(user.outletId, id, body.isAvailable),
    };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
  ): Promise<ApiSuccess<MenuItemDto>> {
    return { success: true, data: await this.items.archive(user.outletId, id) };
  }
}
