import { ErrorCode } from 'shared';
import type { PublicOrderDto } from 'shared';
import { ApiClientError, apiFetch } from './api';
import { resolveDevUrl } from './dev-url';
import { orderProgress } from './order-progress';
import { buildOrderPayload, placeOrder } from './place-order';
import { activeOrderForTable, ACTIVE_ORDER_TTL_MS, markOrderDone, rememberOrder } from './placed-orders';
import { uuidV4 } from './uuid';

vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./api')>()), apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

describe('resolveDevUrl (uji di HP tanpa ubah .env)', () => {
  it('dev + halaman dibuka dari IP LAN: localhost diganti host halaman', () => {
    expect(resolveDevUrl('http://localhost:4000/api', '192.168.137.1', 'development')).toBe('http://192.168.137.1:4000/api');
    expect(resolveDevUrl('http://127.0.0.1:4000/realtime', '192.168.2.59', 'development')).toBe(
      'http://192.168.2.59:4000/realtime',
    );
  });

  it('tidak berubah bila halaman dibuka dari localhost, di server, atau URL bukan localhost', () => {
    expect(resolveDevUrl('http://localhost:4000/api', 'localhost', 'development')).toBe('http://localhost:4000/api');
    expect(resolveDevUrl('http://localhost:4000/api', undefined, 'development')).toBe('http://localhost:4000/api');
    expect(resolveDevUrl('https://api.matwona.id/api', '192.168.137.1', 'development')).toBe('https://api.matwona.id/api');
  });

  it('produksi tidak pernah diubah', () => {
    expect(resolveDevUrl('http://localhost:4000/api', '192.168.137.1', 'production')).toBe('http://localhost:4000/api');
  });
});

describe('uuidV4 (Idempotency-Key)', () => {
  it('format UUID v4, juga saat crypto.randomUUID tidak ada (HTTP non-secure di HP)', () => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuidV4()).toMatch(pattern);
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, uuidV4));
      expect([...ids].every((id) => pattern.test(id))).toBe(true);
      expect(ids.size).toBe(50);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});

describe('orderProgress (FR-007)', () => {
  const cashier = { paymentMethod: 'CASHIER', paymentStatus: 'UNPAID' } as const;
  const states = (p: ReturnType<typeof orderProgress>) => p.steps.map((s) => s.state);

  it('bayar di kasir: Menunggu kasir → Diterima kasir → Sedang disiapkan → Disajikan', () => {
    const p = orderProgress({ ...cashier, status: 'NEW' });
    expect(p.steps.map((s) => s.label)).toEqual(['Menunggu kasir', 'Diterima kasir', 'Sedang disiapkan', 'Disajikan']);
    expect(states(p)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(states(orderProgress({ ...cashier, status: 'PREPARING' }))).toEqual(['done', 'done', 'current', 'todo']);
    expect(orderProgress({ ...cashier, status: 'CONFIRMED' }).headline).toBe('Pesananmu sudah diterima kasir 🙌');
    expect(orderProgress({ ...cashier, status: 'PREPARING' }).subline).toBe('Dapur lagi memasak. Duduk santai, ya!');
  });

  it('QRIS belum lunas: langkah pertama "Menunggu pembayaran"', () => {
    const p = orderProgress({ status: 'NEW', paymentMethod: 'QRIS', paymentStatus: 'PENDING' });
    expect(p.steps[0]!.label).toBe('Menunggu pembayaran');
  });

  it('selesai & batal adalah status akhir', () => {
    const done = orderProgress({ ...cashier, paymentStatus: 'PAID', status: 'COMPLETED' });
    expect(states(done)).toEqual(['done', 'done', 'done', 'done']);
    expect(done.final).toBe(true);
    const cancelled = orderProgress({ ...cashier, status: 'CANCELLED' });
    expect(cancelled).toMatchObject({ steps: [], final: true });
    expect(cancelled.headline).toContain('dibatalkan');
  });
});

describe('placed-orders (banner "Lihat pesanan aktif")', () => {
  beforeEach(() => localStorage.clear());
  const order = { code: 'MTW-261105-0001', outlet: 'matwona', tableToken: 'MEJA-1', createdAt: new Date().toISOString() };

  it('pesanan terbaru meja ini aktif sampai selesai atau lewat 12 jam', () => {
    rememberOrder(order);
    expect(activeOrderForTable('MEJA-1')?.code).toBe(order.code);
    expect(activeOrderForTable('MEJA-2')).toBeUndefined();
    expect(activeOrderForTable('MEJA-1', Date.now() + ACTIVE_ORDER_TTL_MS + 1)).toBeUndefined();
    markOrderDone(order.code);
    expect(activeOrderForTable('MEJA-1')).toBeUndefined();
  });

  it('localStorage rusak tidak membuat error', () => {
    localStorage.setItem('matwona-orders', '{bukan json');
    expect(activeOrderForTable('MEJA-1')).toBeUndefined();
  });
});

describe('placeOrder (FR-004)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  const input = {
    tableToken: 'MEJA-1',
    idempotencyKey: '0192f1a4-6c3e-7b2a-9d41-5f0e8c7a1b22',
    customerName: '  Rina ',
    customerPhone: '',
    paymentMethod: 'CASHIER' as const,
    lines: [{ menuItemId: 't1', name: 'Tuna', unitPrice: 45000, quantity: 2, note: ' pedas ' }],
  };

  it('payload: nama di-trim, HP kosong dihapus, expectedUnitPrice = harga yang dilihat pelanggan', () => {
    expect(buildOrderPayload(input)).toEqual({
      customerName: 'Rina',
      customerPhone: undefined,
      paymentMethod: 'CASHIER',
      items: [{ menuItemId: 't1', quantity: 2, note: 'pedas', fromRecommendation: false, expectedUnitPrice: 45000 }],
    });
  });

  it('mengirim header X-Table-Token & Idempotency-Key', async () => {
    fetchMock.mockResolvedValue({ orderCode: 'MTW-261105-0001' });
    await placeOrder(input);
    expect(fetchMock).toHaveBeenCalledWith('/public/orders', expect.objectContaining({
      method: 'POST',
      tableToken: 'MEJA-1',
      idempotencyKey: input.idempotencyKey,
    }));
  });

  it('DUPLICATE_REQUEST dengan pesanan awal dianggap sukses; error lain dilempar', async () => {
    const original = { orderCode: 'MTW-261105-0001' } as PublicOrderDto;
    fetchMock.mockRejectedValueOnce(
      new ApiClientError(409, { code: ErrorCode.DUPLICATE_REQUEST, message: 'x', details: { order: original } }),
    );
    expect(await placeOrder(input)).toBe(original);

    fetchMock.mockRejectedValueOnce(new ApiClientError(409, { code: ErrorCode.ITEM_UNAVAILABLE, message: 'habis' }));
    await expect(placeOrder(input)).rejects.toMatchObject({ error: { code: ErrorCode.ITEM_UNAVAILABLE } });
  });
});
