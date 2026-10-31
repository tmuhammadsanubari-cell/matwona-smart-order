import type { ApiResponse, TableQrLayout } from 'shared';
import { ApiClientError } from './api';
import { resolveDevUrl } from './dev-url';
import { refreshSession } from './staff-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function fetchPdf(query: string): Promise<Response> {
  return fetch(`${resolveDevUrl(API_URL)}/tables/qr.pdf?${query}`, { credentials: 'include', cache: 'no-store' });
}

/**
 * Unduh PDF QR meja (GET /tables/qr.pdf, FR-011). Respons sukses berupa file, bukan JSON, sehingga
 * tidak lewat apiFetch; 401 tetap dicoba refresh sesi sekali. Error API (JSON) menjadi ApiClientError.
 */
export async function downloadTablesQr(options: { ids?: string[]; layout: TableQrLayout }): Promise<void> {
  const query = new URLSearchParams({ layout: options.layout, ...(options.ids?.length ? { ids: options.ids.join(',') } : {}) }).toString();
  let res = await fetchPdf(query);
  if (res.status === 401 && (await refreshSession())) res = await fetchPdf(query);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    throw new ApiClientError(
      res.status,
      body && body.success === false ? body.error : { code: 'INTERNAL_ERROR', message: 'Gagal mengunduh PDF QR. Coba lagi.' },
    );
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `qr-meja-${options.layout}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
