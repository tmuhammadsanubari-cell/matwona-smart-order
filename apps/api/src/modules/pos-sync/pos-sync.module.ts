import { Module } from '@nestjs/common';
import { MockOlseraAdapter } from './adapters/mock-olsera.adapter.js';
import { OlseraCsvAdapter } from './adapters/olsera-csv.adapter.js';
import { POS_SYNC_ADAPTER, PosSyncAdapter } from './adapters/pos-sync.adapter.js';

/**
 * Menyediakan PosSyncAdapter sesuai env POS_SYNC_ADAPTER.
 * Controller & service (preview/apply/export/logs) ditambahkan di S2-07…S2-10.
 */
@Module({
  providers: [
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
  exports: [POS_SYNC_ADAPTER],
})
export class PosSyncModule {}
