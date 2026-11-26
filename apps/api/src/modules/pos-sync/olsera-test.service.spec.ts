import { afterEach, describe, expect, it, vi } from 'vitest';
import { olseraTestProbeSchema, olseraTestTokenSchema } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { OlseraTestService } from './olsera-test.service.js';

describe('OlseraTestService (Safe Read-Only Proxy)', () => {
  const service = new OlseraTestService();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('menolak endpoint mutasi atau berbahaya (update, delete, order create, SSRF)', () => {
    const dangerousPaths = [
      'product/delete',
      'product/update',
      'order/openorder/updatestatus',
      'order/salesreturn/updatestatus',
      'order/salesreturn/updateadditional',
      'https://evil.example.com/steal',
      '../global/store',
    ];

    for (const badPath of dangerousPaths) {
      const schemaCheck = olseraTestProbeSchema.safeParse({
        environment: 'production',
        lang: 'en',
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.testtoken123',
        path: badPath,
      });
      expect(schemaCheck.success).toBe(false);
      expect(() =>
        service.buildSafeReadUrl('production', 'en', badPath),
      ).toThrowError(AppException);
    }
  });

  it('membangun URL read-only yang valid dan membatasi per_page serta query key', () => {
    const url = service.buildSafeReadUrl('production', 'en', 'product', {
      per_page: 9999,
      page: 0,
      search: 'tuna',
      arbitraryParam: 'drop table',
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://api-open.olsera.co.id');
    expect(parsed.pathname).toBe('/api/open-api/v1/en/product');
    expect(parsed.searchParams.get('per_page')).toBe('50');
    expect(parsed.searchParams.get('page')).toBe('1');
    expect(parsed.searchParams.get('search')).toBe('tuna');
    expect(parsed.searchParams.has('arbitraryParam')).toBe(false);
  });

  it('menggunakan endpoint sandbox Olsera saat environment=sandbox', () => {
    const url = service.buildSafeReadUrl('sandbox', 'id', 'global/store', {
      per_page: 10,
    });
    expect(url).toBe('https://api-open.all.olsera.indociti.com/api/open-api/v1/id/global/store?per_page=10');
  });

  it('selalu memanggil fetch dengan metode GET dan header Bearer tanpa menyimpan token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 1, name: 'Tuna Sambal Matah', sell_price: 29000 }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await service.probeReadOnly({
      environment: 'production',
      lang: 'en',
      accessToken: 'Bearer sample-jwt-token-value',
      path: 'product',
      query: { per_page: 20, page: 1 },
    });

    expect(res.ok).toBe(true);
    expect(res.safeReadOnly).toBe(true);
    expect(res.itemCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, init] = fetchSpy.mock.calls[0]!;
    expect(calledUrl).toBe('https://api-open.olsera.co.id/api/open-api/v1/en/product?per_page=20&page=1');
    expect(init?.method).toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sample-jwt-token-value');
  });

  it('menukar app_id dan secret_key memakai POST /api/open-api/v1/id/token', async () => {
    const parsedInput = olseraTestTokenSchema.parse({
      environment: 'production',
      lang: 'id',
      grantType: 'secret_key',
      appId: 'app-123',
      secretKey: 'sec-456',
      bodyFormat: 'json',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token_type: 'Bearer',
          expires_in: 86400,
          access_token: 'abc.def.ghi',
          refresh_token: 'ref-999',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await service.fetchToken(parsedInput);
    expect(res.ok).toBe(true);
    expect(res.accessToken).toBe('abc.def.ghi');
    expect(res.refreshToken).toBe('ref-999');

    const [calledUrl, init] = fetchSpy.mock.calls[0]!;
    expect(calledUrl).toBe('https://api-open.olsera.co.id/api/open-api/v1/id/token');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      app_id: 'app-123',
      secret_key: 'sec-456',
      grant_type: 'secret_key',
    });
  });
});
