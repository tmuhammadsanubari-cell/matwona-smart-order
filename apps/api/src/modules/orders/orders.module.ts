import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { OrdersController, PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { StaffOrdersService } from './staff-orders.service.js';

/** Pesanan tamu (FR-004) & pengelolaan oleh kasir (FR-006, FR-008). */
@Module({
  imports: [TablesModule, MenuModule],
  controllers: [PublicOrdersController, OrdersController],
  providers: [OrdersService, StaffOrdersService],
  exports: [OrdersService, StaffOrdersService],
})
export class OrdersModule {}
