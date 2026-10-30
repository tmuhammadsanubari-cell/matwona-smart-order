import { ErrorCode } from 'shared';
import { ApiClientError, apiFetch } from '@/lib/api';
import { loadTableMenu } from './load-table-menu';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: vi.fn(),
}));

const fetchMock = vi.mocked(apiFetch);
const TABLE = { table: { id: 't1', label: '5' }, outlet: { id: 'o1', slug: 'matwona', name: 'Matwona' } };
const MENU = { outlet: TABLE.outlet, categories: [] };

function respond(table: unknown, menu: unknown = MENU) {
  fetchMock.mockImplementation(async (path: string) => {
    const value = path.startsWith('/public/tables/') ? table : menu;
    if (value instanceof Error) throw value;
    return value;
  });
}

const apiError = (status: number, code: ErrorCode) => new ApiClientError(status, { code, message: 'x' });

describe('loadTableMenu (FR-001)', () => {
  // Blok {} wajib: mockReset() mengembalikan mock, dan fungsi yang dikembalikan beforeEach dianggap teardown.
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('token valid: data meja & menu, diambil paralel tanpa cache', async () => {
    respond(TABLE);
    const result = await loadTableMenu('matwona', 'TOKEN');
    expect(result).toEqual({ kind: 'ok', table: TABLE.table, outlet: TABLE.outlet, menu: MENU });
    expect(fetchMock).toHaveBeenCalledWith('/public/tables/TOKEN', { cache: 'no-store' });
    expect(fetchMock).toHaveBeenCalledWith('/public/outlets/matwona/menu', { cache: 'no-store' });
  });

  it('token tidak dikenal / meja nonaktif → invalid-token (walau menu gagal)', async () => {
    respond(apiError(400, ErrorCode.INVALID_TABLE_TOKEN), apiError(404, ErrorCode.NOT_FOUND));
    expect(await loadTableMenu('matwona', 'x')).toEqual({ kind: 'invalid-token' });
  });

  it('slug URL berbeda dengan outlet meja → wrong-outlet', async () => {
    respond(TABLE, apiError(404, ErrorCode.NOT_FOUND));
    expect(await loadTableMenu('salah', 'TOKEN')).toEqual({ kind: 'wrong-outlet', slug: 'matwona' });
  });

  it('API mati → error dilempar ke error.tsx', async () => {
    respond(apiError(500, ErrorCode.INTERNAL_ERROR));
    await expect(loadTableMenu('matwona', 'TOKEN')).rejects.toBeInstanceOf(ApiClientError);

    respond(TABLE, apiError(500, ErrorCode.INTERNAL_ERROR));
    await expect(loadTableMenu('matwona', 'TOKEN')).rejects.toBeInstanceOf(ApiClientError);
  });
});
