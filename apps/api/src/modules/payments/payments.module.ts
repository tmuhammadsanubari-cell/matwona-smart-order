import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { MenuModule } from '../menu/menu.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [PrismaModule, TablesModule, RealtimeModule, MenuModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
