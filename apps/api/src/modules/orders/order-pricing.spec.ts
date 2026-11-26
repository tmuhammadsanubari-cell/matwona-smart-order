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
        promoId: null,
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
        promoId: null,
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

  it('menerapkan promo diskon otomatis dengan diskon terbesar per item (FR-020, BRU-11)', () => {
    // Hari ini Jumat (5)
    const jumat = new Date('2026-11-20T10:00:00Z'); // 2026-11-20 adalah Jumat (day 5)
    const promos = [
      {
        id: 'promo-10pct',
        title: 'Diskon 10% Tuna',
        discountType: 'PERCENT' as const,
        discountValue: 10,
        minPurchase: 40000,
        activeDays: [5], // Jumat saja
        applicableMenuItemIds: [TUNA],
      },
      {
        id: 'promo-nom-3k',
        title: 'Potongan Rp 3.000',
        discountType: 'NOMINAL' as const,
        discountValue: 3000,
        minPurchase: 20000,
        activeDays: [5],
        applicableMenuItemIds: [TUNA],
      },
    ];

    // Tuna 45.000: Diskon 10% = 4.500. Potongan 3.000 = 3.000. Sistem wajib memilih yang terbesar (4.500)
    const priced = priceOrder([line(TUNA, 1), line(ESTEH, 1)], menu, promos, jumat);
    expect(priced.subtotalAmount).toBe(53000);
    expect(priced.discountAmount).toBe(4500);
    expect(priced.totalAmount).toBe(48500);
    expect(priced.lines[0]?.promoId).toBe('promo-10pct');
    expect(priced.lines[0]?.discountAmount).toBe(4500);
    expect(priced.lines[0]?.lineTotal).toBe(40500);
    // Es teh tidak dapat promo
    expect(priced.lines[1]?.promoId).toBeNull();
    expect(priced.lines[1]?.discountAmount).toBe(0);
  });

  it('promo tidak berlaku jika syarat minPurchase atau hari aktif tidak cocok', () => {
    // Hari Sabtu (6)
    const sabtu = new Date('2026-11-21T10:00:00Z');
    const promos = [
      {
        id: 'promo-jumat',
        title: 'Diskon Khusus Jumat',
        discountType: 'PERCENT' as const,
        discountValue: 20,
        minPurchase: 10000,
        activeDays: [5], // Hanya Jumat
        applicableMenuItemIds: [],
      },
      {
        id: 'promo-min-100k',
        title: 'Diskon Belanja 100rb',
        discountType: 'NOMINAL' as const,
        discountValue: 15000,
        minPurchase: 100000, // Minimal 100k
        activeDays: [1, 2, 3, 4, 5, 6, 7],
        applicableMenuItemIds: [],
      },
    ];

    const priced = priceOrder([line(TUNA, 1)], menu, promos, sabtu);
    expect(priced.subtotalAmount).toBe(45000);
    expect(priced.discountAmount).toBe(0);
    expect(priced.totalAmount).toBe(45000);
    expect(priced.lines[0]?.promoId).toBeNull();
  });

  it('mematuhi kuota promo maxQuantity dan menghitung sisa kuota dengan benar', () => {
    const promos = [
      {
        id: 'promo-quota',
        title: 'Promo 1000 Porsi Pertama',
        discountType: 'NOMINAL' as const,
        discountValue: 5000,
        minPurchase: 0,
        maxQuantity: 1000,
        usedQuantity: 998,
        activeDays: [],
        applicableMenuItemIds: [TUNA],
      },
    ];

    // Pesan 3 porsi Tuna, sisa kuota hanya 2 → hanya 2 porsi yang didiskon (2 × 5.000 = 10.000)
    const priced = priceOrder([line(TUNA, 3)], menu, promos);
    expect(priced.discountAmount).toBe(10000);
    expect(priced.totalAmount).toBe(125000);
    expect(priced.promoUsageIncrements?.get('promo-quota')).toBe(2);

    // Jika kuota sudah habis (usedQuantity === maxQuantity), diskon 0
    const exhausted = priceOrder([line(TUNA, 1)], menu, [{ ...promos[0]!, usedQuantity: 1000 }]);
    expect(exhausted.discountAmount).toBe(0);
    expect(exhausted.lines[0]?.promoId).toBeNull();
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
