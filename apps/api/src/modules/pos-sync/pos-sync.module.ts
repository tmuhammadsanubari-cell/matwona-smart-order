import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { MockOlseraAdapter } from './adapters/mock-olsera.adapter.js';
import { OlseraCsvAdapter } from './adapters/olsera-csv.adapter.js';
import { POS_SYNC_ADAPTER, PosSyncAdapter } from './adapters/pos-sync.adapter.js';
import { PosSyncController } from './pos-sync.controller.js';
import { PosSyncService } from './pos-sync.service.js';

/**
 * Modul integrasi POS Olsera (ADR 0002, FR-013, FR-014).
 * Menyediakan PosSyncAdapter sesuai env POS_SYNC_ADAPTER (olsera-csv | mock).
 */
@Module({
  imports: [MenuModule],
  controllers: [PosSyncController],
  providers: [
    PosSyncService,
    {
      provide: POS_SYNC_ADAPTER,
      useFactory: (): PosSyncAdapter => {
        switch (process.env.POS_SYNC_ADAPTER ?? 'olsera-csv') {
          case 'mock':
            return new MockOlseraAdapter();
          case 'olsera-api':
            throw new Error('OlseraApiAdapter belum tersedia (FR-023). Gunakan olsera-csv.');
          default:
            return new OlseraCsvAdapter();
        }
      },
    },
  ],
  exports: [POS_SYNC_ADAPTER, PosSyncService],
})
export class PosSyncModule {}
