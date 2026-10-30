import type {
  ExternalProduct,
  ExternalTransaction,
  PaidOrderForPos,
  PosSyncAdapter,
  PullResult,
  PushResult,
} from './pos-sync.adapter.js';

/** Data dummy untuk test otomatis & demo tanpa file mitra. Nama menu fiktif. */
export class MockOlseraAdapter implements PosSyncAdapter {
  readonly name = 'mock' as const;

  async pullProducts(): Promise<PullResult<ExternalProduct>> {
    return {
      items: [
        { externalId: 'OLS-001', sku: 'TN-SMT', name: 'Tuna Sambal Matah', categoryName: 'Olahan Tuna', price: 45000, stock: 30 },
        { externalId: 'OLS-002', sku: 'TN-GPK', name: 'Tuna Geprek', categoryName: 'Olahan Tuna', price: 38000, stock: 25 },
        { externalId: 'OLS-003', sku: 'AK-BKR', name: 'Ayam Kampung Bakar', categoryName: 'Olahan Ayam Kampung', price: 42000, stock: 20 },
        { externalId: 'OLS-004', sku: 'MN-ETS', name: 'Es Teh Serai', categoryName: 'Minuman', price: 8000, stock: null },
      ],
      errors: [],
    };
  }

  async pullTransactions(): Promise<PullResult<ExternalTransaction>> {
    return { items: [], errors: [] };
  }

  async pushTransactions(orders: PaidOrderForPos[]): Promise<PushResult> {
    return { kind: 'api', pushed: orders.length, failed: [] };
  }
}
