import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { OutletController } from './outlet.controller.js';
import { OutletService } from './outlet.service.js';

@Module({
  imports: [MenuModule, NotificationsModule, OrdersModule, RealtimeModule],
  controllers: [OutletController],
  providers: [OutletService],
  exports: [OutletService],
})
export class OutletModule {}
