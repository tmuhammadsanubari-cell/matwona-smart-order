import { ApiClientError, apiFetch } from './api';

let refreshing: Promise<boolean> | null = null;

/**
 * Perbarui sesi staf dengan refresh token (cookie HttpOnly, dirotasi server). Request paralel
 * memakai satu refresh yang sama agar token tidak dirotasi dua kali.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= apiFetch('/auth/refresh', { method: 'POST' })
    .then(
      () => true,
      () => false,
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * apiFetch untuk halaman staf (FR-009): access token hanya 15 menit, jadi 401 dicoba refresh sekali
 * lalu request diulang. Bila refresh gagal, 401 diteruskan agar halaman mengarahkan ke /login.
 */
export async function staffFetch<T>(path: string, init?: Parameters<typeof apiFetch>[1]): Promise<T> {
  try {
    return await apiFetch<T>(path, init);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401 && !path.startsWith('/auth/')) {
      if (await refreshSession()) return apiFetch<T>(path, init);
    }
    throw error;
  }
}

export const isUnauthorized = (error: unknown) => error instanceof ApiClientError && error.status === 401;
