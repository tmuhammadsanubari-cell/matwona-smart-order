import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/** Pesanan (FR-004, FR-006). Endpoint kasir (status, mark-paid, cancel) menyusul di S1-07. */
@Module({
  imports: [TablesModule, MenuModule],
  controllers: [PublicOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
