import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { RealtimeAuthService } from './realtime-auth.service.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

/** Socket.IO `/realtime` (FR-007, FR-008, NFR-002). Modul lain memancarkan event lewat RealtimeService. */
@Module({
  imports: [AuthModule, TablesModule],
  providers: [RealtimeGateway, RealtimeAuthService, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
