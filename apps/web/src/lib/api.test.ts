import { ErrorCode } from 'shared';
import { ApiClientError, apiFetch, readCookie } from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = 'mtw_csrf=csrf-123; path=/';
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'mtw_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

const headersOf = () => fetchMock.mock.calls[0]![1].headers as Record<string, string>;

describe('apiFetch (PRD 4.4)', () => {
  it('request yang mengubah data mengirim X-CSRF-Token dari cookie mtw_csrf', async () => {
    await apiFetch('/orders/1/mark-paid', { method: 'POST' });
    expect(headersOf()['x-csrf-token']).toBe('csrf-123');
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include');
  });

  it('FormData (unggah foto): tanpa Content-Type JSON agar browser mengisi boundary multipart', async () => {
    const body = new FormData();
    body.append('file', new Blob(['x'], { type: 'image/png' }), 'foto.png');
    await apiFetch('/menu-items/1/image', { method: 'POST', body });
    expect(headersOf()).not.toHaveProperty('Content-Type');
    expect(headersOf()['x-csrf-token']).toBe('csrf-123');
    expect(fetchMock.mock.calls[0]![1].body).toBe(body);
  });

  it('body JSON tetap memakai Content-Type application/json', async () => {
    await apiFetch('/orders/1/cancel', { method: 'POST', body: JSON.stringify({ reason: 'batal' }) });
    expect(headersOf()['Content-Type']).toBe('application/json');
  });

  it('GET tidak mengirim CSRF', async () => {
    await apiFetch('/orders');
    expect(headersOf()).not.toHaveProperty('x-csrf-token');
  });

  it('readCookie membaca nilai cookie', () => {
    expect(readCookie('mtw_csrf')).toBe('csrf-123');
    expect(readCookie('tidak_ada')).toBeUndefined();
  });

  it('error server menjadi ApiClientError dengan pesan Indonesia', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: ErrorCode.FORBIDDEN, message: 'Sesi tidak valid.' } }), {
        status: 403,
      }),
    );
    await expect(apiFetch('/orders/1/cancel', { method: 'POST' })).rejects.toMatchObject({
      status: 403,
      message: 'Sesi tidak valid.',
    });
    await expect(apiFetch('/x', { method: 'POST' })).rejects.toBeInstanceOf(ApiClientError);
  });
});
