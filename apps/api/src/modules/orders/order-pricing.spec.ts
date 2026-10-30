import { ErrorCode } from 'shared';
import type { CreateOrderInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { nextOrderCode, orderCodePrefix } from './order-code.js';
import { priceOrder } from './order-pricing.js';

const TUNA = '00000000-0000-4000-8000-000000000001';
const ESTEH = '00000000-0000-4000-8000-000000000002';
const AYAM = '00000000-0000-4000-8000-000000000003';

const menu = [
  { id: TUNA, name: 'Tuna Sambal Matah', price: 45000, stock: 5, isAvailable: true, isArchived: false },
  { id: ESTEH, name: 'Es Teh Serai', price: 8000, stock: null, isAvailable: true, isArchived: false },
  { id: AYAM, name: 'Ayam Kampung Bakar', price: 55000, stock: 0, isAvailable: true, isArchived: false },
];

const line = (menuItemId: string, quantity: number, extra: Partial<CreateOrderInput['items'][number]> = {}) => ({
  menuItemId,
  quantity,
  fromRecommendation: false,
  ...extra,
});

function errorOf(fn: () => unknown): AppException {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppException);
    return e as AppException;
  }
  throw new Error('expected AppException');
}

describe('priceOrder (FR-004, NFR-007)', () => {
  it('menghitung ulang total dari harga database, bukan dari klien', () => {
    const priced = priceOrder(
      [line(TUNA, 2, { note: 'sambal dipisah' }), line(ESTEH, 1, { fromRecommendation: true })],
      menu,
    );
    expect(priced.subtotalAmount).toBe(98000);
    expect(priced.discountAmount).toBe(0);
    expect(priced.totalAmount).toBe(98000);
    expect(priced.lines).toEqual([
      {
        menuItemId: TUNA,
        itemNameSnapshot: 'Tuna Sambal Matah',
        quantity: 2,
        unitPrice: 45000,
        discountAmount: 0,
        lineTotal: 90000,
        note: 'sambal dipisah',
        fromRecommendation: false,
      },
      {
        menuItemId: ESTEH,
        itemNameSnapshot: 'Es Teh Serai',
        quantity: 1,
        unitPrice: 8000,
        discountAmount: 0,
        lineTotal: 8000,
        note: null,
        fromRecommendation: true,
      },
    ]);
    expect(Number.isInteger(priced.totalAmount)).toBe(true);
  });

  it('hanya mengurangi stok item yang stoknya dilacak, dijumlah per menu', () => {
    const priced = priceOrder([line(TUNA, 2), line(ESTEH, 3), line(TUNA, 1, { note: 'pedas' })], menu);
    expect([...priced.stockDecrements]).toEqual([[TUNA, 3]]);
    expect(priced.lines).toHaveLength(3);
  });

  it('ITEM_UNAVAILABLE untuk stok 0, stok kurang, nonaktif, arsip, atau tidak dikenal', () => {
    const items = [
      ...menu,
      { id: 'off', name: 'Off', price: 1, stock: null, isAvailable: false, isArchived: false },
      { id: 'arch', name: 'Arsip', price: 1, stock: null, isAvailable: true, isArchived: true },
    ];
    const error = errorOf(() =>
      priceOrder(
        [line(AYAM, 1), line(TUNA, 4), line(TUNA, 2), line('off', 1), line('arch', 1), line('unknown', 1), line(ESTEH, 1)],
        items,
      ),
    );
    expect(error.code).toBe(ErrorCode.ITEM_UNAVAILABLE);
    expect(error.details).toEqual({
      items: [
        { menuItemId: AYAM, name: 'Ayam Kampung Bakar' },
        { menuItemId: TUNA, name: 'Tuna Sambal Matah' },
        { menuItemId: 'off', name: 'Off' },
        { menuItemId: 'arch', name: 'Arsip' },
        { menuItemId: 'unknown', name: null },
      ],
    });
  });

  it('PRICE_CHANGED bila harga di keranjang berbeda dari database', () => {
    const error = errorOf(() =>
      priceOrder([line(TUNA, 1, { expectedUnitPrice: 40000 }), line(ESTEH, 1, { expectedUnitPrice: 8000 })], menu),
    );
    expect(error.code).toBe(ErrorCode.PRICE_CHANGED);
    expect(error.details).toEqual({
      items: [{ menuItemId: TUNA, name: 'Tuna Sambal Matah', expectedUnitPrice: 40000, unitPrice: 45000 }],
    });
  });

  it('item habis didahulukan dibanding perubahan harga', () => {
    const error = errorOf(() => priceOrder([line(AYAM, 1), line(TUNA, 1, { expectedUnitPrice: 1 })], menu));
    expect(error.code).toBe(ErrorCode.ITEM_UNAVAILABLE);
  });
});

describe('kode pesanan MTW-YYMMDD-XXXX', () => {
  it('memakai tanggal WIB (UTC+7)', () => {
    expect(orderCodePrefix(new Date('2026-11-05T05:12:44Z'))).toBe('MTW-261105-');
    // 17:30 UTC = 00:30 WIB keesokan harinya
    expect(orderCodePrefix(new Date('2026-11-05T17:30:00Z'))).toBe('MTW-261106-');
    expect(orderCodePrefix(new Date('2026-12-31T16:59:59Z'))).toBe('MTW-261231-');
    expect(orderCodePrefix(new Date('2026-12-31T17:00:00Z'))).toBe('MTW-270101-');
  });

  it('nomor urut per hari, 4 digit', () => {
    expect(nextOrderCode('MTW-261105-', null)).toBe('MTW-261105-0001');
    expect(nextOrderCode('MTW-261105-', 'MTW-261105-0041')).toBe('MTW-261105-0042');
    expect(() => nextOrderCode('MTW-261105-', 'MTW-261105-9999')).toThrow();
  });
});
