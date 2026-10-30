import path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { PosSyncModule } from './modules/pos-sync/pos-sync.module.js';

// Modul fitur ditambahkan sesuai docs/BACKLOG.md:
// orders (S1-06), realtime (S1-08),
// payments (S2-01), promos (S3-08), analytics (S3-05), recommendations (S3-03), users (S2-12)
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(import.meta.dirname, '../../../.env'), '.env'],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    TablesModule,
    MenuModule,
    PosSyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
