import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { OrdersController, PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrintService } from './print.service.js';
import { StaffOrdersService } from './staff-orders.service.js';

/** Pesanan tamu (FR-004) & pengelolaan oleh kasir (FR-006, FR-008). */
@Module({
  imports: [TablesModule, MenuModule, RealtimeModule, NotificationsModule],
  controllers: [PublicOrdersController, OrdersController],
  providers: [OrdersService, StaffOrdersService, PrintService],
  exports: [OrdersService, StaffOrdersService, PrintService],
})
export class OrdersModule {}
