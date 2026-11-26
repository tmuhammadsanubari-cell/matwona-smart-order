'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  formatRupiah,
  OLSERA_BASE_URLS,
  OLSERA_SAFE_READ_ENDPOINTS,
} from 'shared';
import type {
  MenuItemDto,
  OlseraEnvironment,
  OlseraLang,
  OlseraTestProbeResult,
  OlseraTestTokenResult,
} from 'shared';
import { ApiClientError } from '@/lib/api';
import { todayWib } from '@/lib/cashier-board';
import { staffFetch } from '@/lib/staff-api';
import { Badge, Button, Card, Input, toast } from '@/components/ui';

type AuthTab = 'credentials' | 'manual_token';

const QUICK_PRESET_PATHS = [
  'global/store',
  'collection',
  'product',
  'productvariantonlysearch',
  'order/closeorder',
  'inventory/stockmovement',
  'report/salesdetails',
];

function extractArrayRows(rawBody: unknown): Array<Record<string, unknown>> {
  if (!rawBody || typeof rawBody !== 'object') return [];
  const rec = rawBody as Record<string, unknown>;
  if (Array.isArray(rec.data)) {
    return rec.data.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null);
  }
  return [];
}

function maskSecret(token: string): string {
  const clean = token.trim();
  if (!clean) return '-';
  if (clean.length <= 14) return `${clean.slice(0, 4)}••••`;
  return `${clean.slice(0, 8)}••••${clean.slice(-6)}`;
}

function stringifyQuery(query: Record<string, string | number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) out[k] = String(v);
  return out;
}

function buildDownloadablePostmanJson() {
  return JSON.stringify(
    {
      info: {
        name: 'Matwona Smart Order & Olsera Open API (Read-Only Safe Test)',
        description:
          'Koleksi Postman internal untuk menguji Backend Matwona (/api/*) dan endpoint READ-ONLY Olsera Open API v1 tanpa mutasi data.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [
        { key: 'apiBaseUrl', value: 'http://localhost:4000/api' },
        { key: 'olseraBaseUrl', value: 'https://api-open.olsera.co.id' },
        { key: 'olseraLang', value: 'en' },
        { key: 'olseraAppId', value: '' },
        { key: 'olseraSecretKey', value: '' },
        { key: 'olseraAccessToken', value: '' },
        { key: 'olseraRefreshToken', value: '' },
        { key: 'adminEmail', value: 'admin@matwona.local' },
        { key: 'adminPassword', value: 'Admin123!' },
        { key: 'matwonaCsrfToken', value: '' },
      ],
      item: [
        {
          name: 'Olsera Open API (Read-Only)',
          item: [
            {
              name: 'Auth - Ambil Token',
              request: {
                method: 'POST',
                header: [{ key: 'Accept', value: 'application/json' }],
                body: {
                  mode: 'formdata',
                  formdata: [
                    { key: 'app_id', value: '{{olseraAppId}}', type: 'text' },
                    { key: 'secret_key', value: '{{olseraSecretKey}}', type: 'text' },
                    { key: 'grant_type', value: 'secret_key', type: 'text' },
                  ],
                },
                url: {
                  raw: '{{olseraBaseUrl}}/api/open-api/v1/id/token',
                  host: ['{{olseraBaseUrl}}'],
                  path: ['api', 'open-api', 'v1', 'id', 'token'],
                },
              },
            },
            ...OLSERA_SAFE_READ_ENDPOINTS.slice(0, 8).map((ep) => ({
              name: `${ep.group} - ${ep.label}`,
              request: {
                method: 'GET',
                header: [
                  { key: 'Accept', value: 'application/json' },
                  { key: 'Authorization', value: 'Bearer {{olseraAccessToken}}' },
                ],
                url: {
                  raw: `{{olseraBaseUrl}}/api/open-api/v1/{{olseraLang}}/${ep.path}`,
                  host: ['{{olseraBaseUrl}}'],
                  path: ['api', 'open-api', 'v1', '{{olseraLang}}', ...ep.path.split('/')],
                  query: Object.entries(ep.recommendedQuery).map(([key, val]) => ({
                    key,
                    value: String(val),
                  })),
                },
              },
            })),
          ],
        },
        {
          name: 'Matwona Backend API',
          item: [
            {
              name: 'Auth - Login Admin',
              request: {
                method: 'POST',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: {
                  mode: 'raw',
                  raw: '{\n  "email": "{{adminEmail}}",\n  "password": "{{adminPassword}}"\n}',
                },
                url: {
                  raw: '{{apiBaseUrl}}/auth/login',
                  host: ['{{apiBaseUrl}}'],
                  path: ['auth', 'login'],
                },
              },
            },
            {
              name: 'Olsera Test Proxy - Probe Read-Only',
              request: {
                method: 'POST',
                header: [
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'x-csrf-token', value: '{{matwonaCsrfToken}}' },
                ],
                body: {
                  mode: 'raw',
                  raw: '{\n  "environment": "production",\n  "lang": "en",\n  "accessToken": "{{olseraAccessToken}}",\n  "path": "product",\n  "query": { "per_page": 15, "page": 1 }\n}',
                },
                url: {
                  raw: '{{apiBaseUrl}}/pos-sync/olsera-test/probe',
                  host: ['{{apiBaseUrl}}'],
                  path: ['pos-sync', 'olsera-test', 'probe'],
                },
              },
            },
          ],
        },
      ],
    },
    null,
    2,
  );
}

export function OlseraTestView() {
  const [today] = useState(() => todayWib());
  const [environment, setEnvironment] = useState<OlseraEnvironment>('production');
  const [tokenLang, setTokenLang] = useState<OlseraLang>('id');
  const [probeLang, setProbeLang] = useState<OlseraLang>('en');
  const [bodyFormat, setBodyFormat] = useState<'json' | 'form'>('json');
  const [authTab, setAuthTab] = useState<AuthTab>('credentials');

  // Kredensial disimpan HANYA di React state sementara (tidak pernah ke DB / localStorage / .env).
  const [appId, setAppId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [tokenResult, setTokenResult] = useState<OlseraTestTokenResult | null>(null);

  const [selectedPath, setSelectedPath] = useState<string>('product');
  const [queryValues, setQueryValues] = useState<Record<string, string>>(() => ({
    per_page: '20',
    page: '1',
  }));
  const [probeResult, setProbeResult] = useState<OlseraTestProbeResult | null>(null);
  const [dryRunDiff, setDryRunDiff] = useState<Array<{
    olseraName: string;
    olseraSku: string;
    olseraPrice: number | null;
    olseraStock: number | null;
    matchedLocalName: string | null;
  }> | null>(null);

  const selectedSpec = useMemo(
    () =>
      OLSERA_SAFE_READ_ENDPOINTS.find((ep) => ep.path === selectedPath) ??
      OLSERA_SAFE_READ_ENDPOINTS[0]!,
    [selectedPath],
  );

  const selectEndpoint = (path: string) => {
    setSelectedPath(path);
    setDryRunDiff(null);
    const spec = OLSERA_SAFE_READ_ENDPOINTS.find((ep) => ep.path === path);
    if (!spec) return;
    const next = stringifyQuery(spec.recommendedQuery);
    if ('end_date' in next) next.end_date = today;
    if ('to' in next) next.to = today;
    setQueryValues(next);
  };

  const tokenMutation = useMutation({
    mutationFn: (grantType: 'secret_key' | 'refresh_token') =>
      staffFetch<OlseraTestTokenResult>('/pos-sync/olsera-test/token', {
        method: 'POST',
        body: JSON.stringify({
          environment,
          lang: tokenLang,
          grantType,
          bodyFormat,
          ...(grantType === 'secret_key' ? { appId, secretKey } : { refreshToken }),
        }),
      }),
    onSuccess: (res) => {
      setTokenResult(res);
      if (res.accessToken) setAccessToken(res.accessToken);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      toast(res.ok ? 'Access token Olsera berhasil diambil!' : `Olsera merespons HTTP ${res.statusCode}`);
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal mengambil token Olsera.');
    },
  });

  const probeMutation = useMutation({
    mutationFn: () =>
      staffFetch<OlseraTestProbeResult>('/pos-sync/olsera-test/probe', {
        method: 'POST',
        body: JSON.stringify({
          environment,
          lang: probeLang,
          accessToken,
          path: selectedPath,
          query: queryValues,
        }),
      }),
    onSuccess: (res) => {
      setProbeResult(res);
      setDryRunDiff(null);
      toast(
        res.ok
          ? `Sukses GET ${selectedPath} (${res.durationMs} ms)`
          : `Olsera HTTP ${res.statusCode}`,
      );
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal menghubungi endpoint Olsera.');
    },
  });

  const dryRunCompareMutation = useMutation({
    mutationFn: () => staffFetch<MenuItemDto[]>('/menu-items'),
    onSuccess: (localItems) => {
      const rows = extractArrayRows(probeResult?.rawBody);
      if (rows.length === 0) {
        toast('Respons saat ini tidak memiliki array data untuk dibandingkan.');
        return;
      }

      const bySku = new Map<string, MenuItemDto>();
      const byName = new Map<string, MenuItemDto>();
      for (const item of localItems) {
        if (item.sku) bySku.set(item.sku.trim().toLowerCase(), item);
        byName.set(item.name.trim().toLowerCase(), item);
      }

      const diff = rows.slice(0, 30).map((r) => {
        const name = String(r.name ?? r.product_name ?? r.title ?? '-');
        const sku = String(r.sku ?? r.code ?? r.product_sku ?? '').trim();
        const rawPrice = r.sell_price ?? r.price ?? r.sell_price_pos;
        const rawStock = r.stock_qty ?? r.qty ?? r.stock;
        const matched =
          (sku ? bySku.get(sku.toLowerCase()) : undefined) ?? byName.get(name.toLowerCase());

        return {
          olseraName: name,
          olseraSku: sku || '-',
          olseraPrice: typeof rawPrice === 'number' ? rawPrice : Number(rawPrice) || null,
          olseraStock: typeof rawStock === 'number' ? rawStock : Number.isFinite(Number(rawStock)) && rawStock !== null && rawStock !== '' ? Number(rawStock) : null,
          matchedLocalName: matched?.name ?? null,
        };
      });

      setDryRunDiff(diff);
      toast(`Dry-run membandingkan ${diff.length} item (tanpa mengubah database)`);
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal memuat menu lokal.');
    },
  });

  const clearCredentials = () => {
    setAppId('');
    setSecretKey('');
    setAccessToken('');
    setRefreshToken('');
    setTokenResult(null);
    setProbeResult(null);
    setDryRunDiff(null);
    toast('Semua API key & token dihapus dari memori browser');
  };

  const downloadPostman = () => {
    const content = buildDownloadablePostmanJson();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matwona-olsera-test.postman_collection.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Koleksi Postman diunduh');
  };

  const copyJson = async (value: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      toast('Respons JSON disalin');
    } catch {
      toast('Gagal menyalin JSON');
    }
  };

  const parsedRows = useMemo(() => extractArrayRows(probeResult?.rawBody), [probeResult]);

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Jaminan Keamanan */}
      <Card className="border-2 border-primary/30 bg-success-soft/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">MODE INTERNAL · READ-ONLY AMAN</Badge>
              <Badge tone="neutral">Tanpa Simpan Key</Badge>
            </div>
            <h2 className="text-base font-extrabold text-ink">
              Konsol Uji Internal Olsera Open API v1 (Non-Destruktif)
            </h2>
            <p className="text-xs leading-relaxed text-ink">
              Halaman ini khusus tim internal (wajib login Admin, terpisah dari landing page &amp; menu pelanggan).
              Kredensial Anda <strong>tidak disimpan ke database, .env, ataupun localStorage</strong>.
              Backend proxy mengunci semua panggilan data hanya ke metode <strong>GET</strong> pada daftar endpoint baca-saja resmi Olsera, sehingga toko POS maupun database Matwona dijamin aman dan tidak berubah sedikit pun.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={clearCredentials}>
            Bersihkan Kunci dari Memori
          </Button>
        </div>
      </Card>

      {/* Panel 1: Autentikasi Token */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink">1. Kredensial &amp; Token Olsera</h3>
            <p className="mt-0.5 text-xs text-muted">
              Berdasarkan dokumentasi resmi{' '}
              <span className="font-mono">docs-api-open.olsera.co.id</span>: tukar{' '}
              <span className="font-mono">app_id</span> &amp;{' '}
              <span className="font-mono">secret_key</span> (<span className="font-mono">grant_type=secret_key</span>) atau tempel token langsung.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setAuthTab('credentials')}
              className={`rounded-control border px-3 py-1.5 text-xs font-bold ${
                authTab === 'credentials'
                  ? 'border-primary bg-primary text-cream'
                  : 'border-line bg-surface text-ink'
              }`}
            >
              App ID &amp; Secret Key
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('manual_token')}
              className={`rounded-control border px-3 py-1.5 text-xs font-bold ${
                authTab === 'manual_token'
                  ? 'border-primary bg-primary text-cream'
                  : 'border-line bg-surface text-ink'
              }`}
            >
              Tempel Bearer Token
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="olsera-env" className="text-sm font-bold text-ink">
              Environment Host
            </label>
            <select
              id="olsera-env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as OlseraEnvironment)}
              className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-xs font-semibold text-ink focus:border-primary focus:outline-none"
            >
              <option value="production">Production ({OLSERA_BASE_URLS.production})</option>
              <option value="sandbox">Sandbox ({OLSERA_BASE_URLS.sandbox})</option>
            </select>
          </div>

          <div>
            <label htmlFor="olsera-token-lang" className="text-sm font-bold text-ink">
              Bahasa Endpoint Token
            </label>
            <select
              id="olsera-token-lang"
              value={tokenLang}
              onChange={(e) => setTokenLang(e.target.value as OlseraLang)}
              className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-xs font-semibold text-ink focus:border-primary focus:outline-none"
            >
              <option value="id">/api/open-api/v1/id/token (Default Docs)</option>
              <option value="en">/api/open-api/v1/en/token</option>
            </select>
          </div>

          <div>
            <label htmlFor="olsera-body-format" className="text-sm font-bold text-ink">
              Format Body Token
            </label>
            <select
              id="olsera-body-format"
              value={bodyFormat}
              onChange={(e) => setBodyFormat(e.target.value as 'json' | 'form')}
              className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-xs font-semibold text-ink focus:border-primary focus:outline-none"
            >
              <option value="json">JSON (Console Docs Olsera)</option>
              <option value="form">Multipart Form-Data (Postman Olsera)</option>
            </select>
          </div>
        </div>

        {authTab === 'credentials' ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="App ID (dari Olsera Console)"
                placeholder="Contoh: 8R7yXPhDHJ0YG2S9FXkd"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                autoComplete="off"
              />
              <Input
                label="Secret Key"
                type="password"
                placeholder="Masukkan Secret Key dari Developer Console Olsera"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                loading={tokenMutation.isPending}
                disabled={!appId.trim() || !secretKey.trim()}
                onClick={() => tokenMutation.mutate('secret_key')}
              >
                Ambil Access Token (POST /token)
              </Button>
              {refreshToken && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={tokenMutation.isPending}
                  onClick={() => tokenMutation.mutate('refresh_token')}
                >
                  Perbarui via Refresh Token
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Input
              label="Access Token Olsera (Bearer)"
              type="password"
              placeholder="Tempel JWT access_token dari Olsera di sini..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              hint="Token hanya disimpan di memori halaman ini."
              autoComplete="off"
            />
          </div>
        )}

        <div className="mt-4 rounded-card border border-line bg-cream/60 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-ink">Status Token Sesi: </span>
              {accessToken ? (
                <Badge tone="success">Siap Dipakai ({maskSecret(accessToken)})</Badge>
              ) : (
                <Badge tone="neutral">Belum Ada Token</Badge>
              )}
            </div>
            {tokenResult?.expiresIn && (
              <span className="text-muted">Berlaku {tokenResult.expiresIn} detik</span>
            )}
          </div>
          {tokenResult && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-primary">
                Lihat Respons Mentah Token (HTTP {tokenResult.statusCode} · {tokenResult.durationMs} ms)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-ink p-3 font-mono text-[11px] text-cream">
                {JSON.stringify(tokenResult.rawBody, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </Card>

      {/* Panel 2: Eksplorasi Endpoint Read-Only */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink">2. Uji Endpoint Data (Khusus GET Read-Only)</h3>
            <p className="mt-0.5 text-xs text-muted">
              Pilih endpoint aman di bawah untuk melihat struktur data asli toko Olsera Anda tanpa mengubah apa pun.
            </p>
          </div>
          <div>
            <label htmlFor="probe-lang" className="mr-2 text-xs font-bold text-muted">
              Locale:
            </label>
            <select
              id="probe-lang"
              value={probeLang}
              onChange={(e) => setProbeLang(e.target.value as OlseraLang)}
              className="rounded-control border border-line-strong bg-surface px-2.5 py-1 text-xs font-bold text-ink"
            >
              <option value="en">/en/</option>
              <option value="id">/id/</option>
            </select>
          </div>
        </div>

        {/* Shortcut Cepat */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PRESET_PATHS.map((p) => {
            const ep = OLSERA_SAFE_READ_ENDPOINTS.find((x) => x.path === p);
            if (!ep) return null;
            const active = selectedPath === ep.path;
            return (
              <button
                key={ep.path}
                type="button"
                onClick={() => selectEndpoint(ep.path)}
                className={`rounded-control border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-cream'
                    : 'border-line bg-cream text-ink hover:bg-primary-soft'
                }`}
              >
                {ep.label.split(' (')[0]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="endpoint-select" className="text-sm font-bold text-ink">
              Daftar Lengkap Endpoint Read-Only
            </label>
            <select
              id="endpoint-select"
              value={selectedPath}
              onChange={(e) => selectEndpoint(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
            >
              {OLSERA_SAFE_READ_ENDPOINTS.map((ep) => (
                <option key={ep.path} value={ep.path}>
                  [{ep.group}] GET /open-api/v1/{probeLang}/{ep.path} — {ep.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">{selectedSpec.description}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-ink">Parameter Query (Opsional)</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {Object.keys(selectedSpec.recommendedQuery).map((qKey) => (
                <Input
                  key={qKey}
                  label={qKey}
                  value={queryValues[qKey] ?? ''}
                  onChange={(e) =>
                    setQueryValues((prev) => ({ ...prev, [qKey]: e.target.value }))
                  }
                  placeholder={String(selectedSpec.recommendedQuery[qKey])}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            loading={probeMutation.isPending}
            disabled={accessToken.trim().length < 10}
            onClick={() => probeMutation.mutate()}
          >
            Jalankan Tes GET /{selectedPath}
          </Button>
          {accessToken.trim().length < 10 && (
            <span className="text-xs text-muted">
              Ambil atau tempel Access Token Olsera terlebih dahulu pada bagian 1.
            </span>
          )}
        </div>

        {probeResult && (
          <div className="mt-5 space-y-4 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone={probeResult.ok ? 'success' : 'danger'}>
                  HTTP {probeResult.statusCode}
                </Badge>
                <Badge tone="info">GET Read-Only</Badge>
                <span className="font-mono text-muted">{probeResult.durationMs} ms</span>
                {typeof probeResult.itemCount === 'number' && (
                  <span className="font-bold text-ink">{probeResult.itemCount} item diterima</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedRows.length > 0 && selectedPath.startsWith('product') && (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={dryRunCompareMutation.isPending}
                    onClick={() => dryRunCompareMutation.mutate()}
                  >
                    Dry-Run Bandingkan dengan Menu Matwona
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void copyJson(probeResult.rawBody)}
                >
                  Salin JSON
                </Button>
              </div>
            </div>

            <p className="truncate rounded bg-cream px-3 py-1.5 font-mono text-[11px] text-muted">
              GET {probeResult.endpoint}
            </p>

            {/* Tabel Pratinjau jika data berupa array */}
            {parsedRows.length > 0 && (
              <div className="overflow-x-auto rounded-card border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream text-muted">
                    <tr>
                      <th className="px-3 py-2 font-bold">ID</th>
                      <th className="px-3 py-2 font-bold">Nama / Label</th>
                      <th className="px-3 py-2 font-bold">SKU / Kode</th>
                      <th className="px-3 py-2 font-bold">Harga / Total</th>
                      <th className="px-3 py-2 font-bold">Stok / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {parsedRows.slice(0, 20).map((r, i) => {
                      const price = r.sell_price ?? r.price ?? r.total_amount ?? r.sell_price_pos;
                      const stock = r.stock_qty ?? r.qty ?? r.stock;
                      return (
                        <tr key={String(r.id ?? i)}>
                          <td className="px-3 py-2 font-mono text-muted">{String(r.id ?? '-')}</td>
                          <td className="px-3 py-2 font-bold text-ink">
                            {String(r.name ?? r.product_name ?? r.title ?? r.order_no ?? '-')}
                          </td>
                          <td className="px-3 py-2 font-mono text-muted">
                            {String(r.sku ?? r.code ?? r.order_no ?? '-')}
                          </td>
                          <td className="px-3 py-2 text-ink">
                            {price !== undefined && price !== null && Number.isFinite(Number(price))
                              ? formatRupiah(Number(price))
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {stock !== undefined && stock !== null ? `Stok: ${stock}` : String(r.status ?? '-')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Hasil Dry-Run Kecocokan Lokal */}
            {dryRunDiff && (
              <div className="rounded-card border border-primary/25 bg-cream/60 p-3.5">
                <h4 className="text-xs font-extrabold text-ink">
                  Hasil Dry-Run Kecocokan Menu Olsera vs Database Matwona (Tanpa Mengubah Data)
                </h4>
                <div className="mt-2 max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="py-1.5 pr-3">Produk Olsera</th>
                        <th className="py-1.5 pr-3">SKU</th>
                        <th className="py-1.5 pr-3">Harga</th>
                        <th className="py-1.5">Status di Matwona</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dryRunDiff.map((d, idx) => (
                        <tr key={`${d.olseraName}-${idx}`}>
                          <td className="py-1.5 pr-3 font-semibold text-ink">{d.olseraName}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted">{d.olseraSku}</td>
                          <td className="py-1.5 pr-3">
                            {d.olseraPrice !== null ? formatRupiah(d.olseraPrice) : '-'}
                          </td>
                          <td className="py-1.5">
                            {d.matchedLocalName ? (
                              <Badge tone="success">Cocok: {d.matchedLocalName}</Badge>
                            ) : (
                              <Badge tone="warning">Belum ada di menu lokal</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <pre className="max-h-96 overflow-auto rounded-card bg-ink p-4 font-mono text-[11px] leading-relaxed text-cream">
              {JSON.stringify(probeResult.rawBody, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {/* Panel 3: Panduan Postman & Backend Testing */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h3 className="text-base font-extrabold text-ink">3. Pengujian via Postman (Backend Matwona &amp; Olsera)</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Untuk backend Matwona (<span className="font-mono">/api/*</span>), Anda tetap disarankan memiliki Postman untuk uji cepat API internal (login admin, order, split print, maupun Olsera langsung). Kami sudah menyiapkan koleksi Postman v2.1 siap import.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={downloadPostman}>
            Unduh Koleksi Postman (.json)
          </Button>
        </div>
      </Card>
    </div>
  );
}
