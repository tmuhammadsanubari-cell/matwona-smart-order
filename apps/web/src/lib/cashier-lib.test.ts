import { ErrorCode } from 'shared';
import type { StaffOrderDto } from 'shared';
import { safeNextPath } from '@/components/auth/login-form';
import { ApiClientError, apiFetch } from './api';
import { columnOf, groupByColumn, maskPhone, primaryNextStatus, timeWib, todayWib, upsertOrder } from './cashier-board';
import { staffFetch } from './staff-api';

vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./api')>()), apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

const order = (id: string, overrides: Partial<StaffOrderDto> = {}) =>
  ({
    id,
    orderCode: `MTW-261105-000${id}`,
    status: 'NEW',
    createdAt: `2026-11-05T05:0${id}:00Z`,
    updatedAt: `2026-11-05T05:0${id}:00Z`,
    allowedNextStatuses: ['CONFIRMED', 'CANCELLED'],
    ...overrides,
  }) as StaffOrderDto;

describe('kolom dashboard kasir (FR-008)', () => {
  it('status → kolom Baru / Diproses / Disajikan / Selesai', () => {
    expect(['NEW', 'CONFIRMED', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED'].map((s) => columnOf(s as never))).toEqual([
      'new',
      'process',
      'process',
      'served',
      'done',
      'done',
    ]);
  });

  it('kolom aktif urut terlama dulu (FIFO); Selesai urut perubahan terbaru', () => {
    const groups = groupByColumn([
      order('3'),
      order('1'),
      order('2', { status: 'COMPLETED', updatedAt: '2026-11-05T06:00:00Z' }),
      order('4', { status: 'CANCELLED', updatedAt: '2026-11-05T07:00:00Z' }),
    ]);
    expect(groups.new.map((o) => o.id)).toEqual(['1', '3']);
    expect(groups.done.map((o) => o.id)).toEqual(['4', '2']);
  });

  it('aksi utama = transisi maju pertama dari server (bukan batal)', () => {
    expect(primaryNextStatus(order('1'))).toBe('CONFIRMED');
    expect(primaryNextStatus(order('1', { allowedNextStatuses: ['CANCELLED'] }))).toBeUndefined();
  });

  it('upsertOrder mengganti berdasarkan id atau menyisipkan di depan', () => {
    const list = [order('1'), order('2')];
    expect(upsertOrder(list, order('2', { status: 'CONFIRMED' })).map((o) => o.status)).toEqual(['NEW', 'CONFIRMED']);
    expect(upsertOrder(list, order('3')).map((o) => o.id)).toEqual(['3', '1', '2']);
    expect(upsertOrder(undefined, order('1'))).toHaveLength(1);
  });

  it('tanggal & jam dalam WIB', () => {
    expect(todayWib(new Date('2026-11-05T17:30:00Z'))).toBe('2026-11-06');
    expect(timeWib('2026-11-05T05:12:44Z')).toBe('12.12');
  });
});

describe('staffFetch (FR-009)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  const unauthorized = () => new ApiClientError(401, { code: ErrorCode.UNAUTHORIZED, message: 'Sesi berakhir.' });

  it('401 → refresh sesi sekali lalu ulangi request', async () => {
    fetchMock.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce({}).mockResolvedValueOnce(['ok']);
    expect(await staffFetch('/orders')).toEqual(['ok']);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/orders', '/auth/refresh', '/orders']);
  });

  it('refresh gagal → 401 diteruskan (halaman ke /login)', async () => {
    fetchMock.mockRejectedValueOnce(unauthorized()).mockRejectedValueOnce(unauthorized());
    await expect(staffFetch('/orders')).rejects.toMatchObject({ status: 401 });
  });

  it('request paralel yang sama-sama 401 hanya memicu satu refresh', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/auth/refresh') return {};
      if (fetchMock.mock.calls.filter((c) => c[0] === '/auth/refresh').length === 0) throw unauthorized();
      return 'ok';
    });
    await Promise.all([staffFetch('/orders'), staffFetch('/menu-items')]);
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/auth/refresh')).toHaveLength(1);
  });
});

describe('safeNextPath (login ?next=)', () => {
  it('hanya path internal', () => {
    expect(safeNextPath('/cashier', '/x')).toBe('/cashier');
    expect(safeNextPath('//evil.example', '/x')).toBe('/x');
    expect(safeNextPath('https://evil.example', '/x')).toBe('/x');
    expect(safeNextPath(null, '/cashier')).toBe('/cashier');
  });
});

describe('maskPhone (NFR-011)', () => {
  it('menyisakan 4 digit awal & akhir', () => {
    expect(maskPhone('081234567890')).toBe('0812****7890');
    expect(maskPhone('+62 812-3456-7890')).toBe('6281****7890');
  });

  it('nomor pendek tidak bocor utuh', () => {
    expect(maskPhone('0812345')).toBe('08*****');
    expect(maskPhone('12')).toBe('12***');
  });
});
