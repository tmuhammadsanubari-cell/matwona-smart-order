import type { ApiResponse } from 'shared';
import { ApiClientError } from './api';
import { resolveDevUrl } from './dev-url';
import { refreshSession } from './staff-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const fetchFile = (path: string) => fetch(`${resolveDevUrl(API_URL)}${path}`, { credentials: 'include', cache: 'no-store' });

/** Nama file dari header `Content-Disposition: attachment; filename="x.csv"`. */
export function fileNameFromDisposition(header: string | null): string | undefined {
  return header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
}

/**
 * Unduh file dari endpoint staf (PDF QR, CSV transaksi). Respons sukses berupa file, bukan JSON,
 * sehingga tidak lewat apiFetch; 401 tetap dicoba refresh sesi sekali. Error API (JSON) menjadi
 * ApiClientError. Mengembalikan nama file yang dipakai.
 */
export async function downloadStaffFile(path: string, options: { fallbackName: string; errorMessage: string }): Promise<string> {
  let res = await fetchFile(path);
  if (res.status === 401 && (await refreshSession())) res = await fetchFile(path);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    throw new ApiClientError(
      res.status,
      body && body.success === false ? body.error : { code: 'INTERNAL_ERROR', message: options.errorMessage },
    );
  }

  const fileName = fileNameFromDisposition(res.headers.get('Content-Disposition')) ?? options.fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}
