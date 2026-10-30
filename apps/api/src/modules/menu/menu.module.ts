import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesController, MenuItemsController, PublicMenuController } from './menu.controller.js';
import { MenuItemsService } from './menu-items.service.js';
import { PublicMenuService } from './public-menu.service.js';

/** Menu digital (FR-002) & manajemen menu (FR-010). Upload foto menyusul di S2-11. */
@Module({
  controllers: [PublicMenuController, CategoriesController, MenuItemsController],
  providers: [PublicMenuService, CategoriesService, MenuItemsService],
  exports: [PublicMenuService, MenuItemsService],
})
export class MenuModule {}
