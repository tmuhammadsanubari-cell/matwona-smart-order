import type { ApiError, ApiResponse } from 'shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError['error'],
  ) {
    super(error.message);
  }
}

/**
 * Wrapper fetch untuk API. Mengirim cookie staf (credentials: include) dan
 * melempar ApiClientError dengan pesan bahasa Indonesia dari server.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { tableToken?: string; idempotencyKey?: string } = {},
): Promise<T> {
  const { tableToken, idempotencyKey, headers, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(tableToken ? { 'X-Table-Token': tableToken } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
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
