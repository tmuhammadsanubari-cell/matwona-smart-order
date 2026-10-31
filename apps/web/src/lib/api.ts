import { AUTH_COOKIE, CSRF_HEADER } from 'shared';
import type { ApiError, ApiResponse } from 'shared';
import { resolveDevUrl } from './dev-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError['error'],
  ) {
    super(error.message);
  }
}

/** Nilai cookie yang bisa dibaca JS (mis. `mtw_csrf`); undefined di server. */
export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/**
 * Wrapper fetch untuk API. Mengirim cookie staf (credentials: include), header `X-CSRF-Token` dari cookie
 * `mtw_csrf` untuk request yang mengubah data (PRD 4.4), dan melempar ApiClientError dengan pesan
 * bahasa Indonesia dari server.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { tableToken?: string; idempotencyKey?: string } = {},
): Promise<T> {
  const { tableToken, idempotencyKey, headers, ...rest } = init;
  const csrf = SAFE_METHODS.has((rest.method ?? 'GET').toUpperCase()) ? undefined : readCookie(AUTH_COOKIE.CSRF);
  const res = await fetch(`${resolveDevUrl(API_URL)}${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(tableToken ? { 'X-Table-Token': tableToken } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
      ...headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !body || body.success === false) {
    throw new ApiClientError(
      res.status,
      body && body.success === false
        ? body.error
        : { code: 'INTERNAL_ERROR', message: 'Gagal terhubung ke server. Coba lagi.' },
    );
  }
  return body.data;
}
