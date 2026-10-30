import { ErrorCode } from 'shared';
import type { PublicMenu, PublicTableInfo } from 'shared';
import { ApiClientError, apiFetch } from '@/lib/api';

export type TableMenuResult =
  | { kind: 'ok'; table: PublicTableInfo['table']; outlet: PublicTableInfo['outlet']; menu: PublicMenu }
  | { kind: 'invalid-token' }
  | { kind: 'wrong-outlet'; slug: string };

// Data menu & stok harus segar (label "Habis"); cache sudah ditangani Redis di API (60 dtk).
const noStore = { cache: 'no-store' } as const;

/**
 * Data halaman menu meja (FR-001, FR-002). Token & menu diambil paralel; token tidak dikenal atau
 * meja nonaktif → `invalid-token`. Slug di URL berbeda dengan outlet meja → `wrong-outlet`.
 * Error lain (API mati) dilempar agar ditangani error.tsx.
 */
export async function loadTableMenu(slug: string, token: string): Promise<TableMenuResult> {
  const [tableResult, menuResult] = await Promise.allSettled([
    apiFetch<PublicTableInfo>(`/public/tables/${encodeURIComponent(token)}`, noStore),
    apiFetch<PublicMenu>(`/public/outlets/${encodeURIComponent(slug)}/menu`, noStore),
  ]);

  if (tableResult.status === 'rejected') {
    const error = tableResult.reason;
    if (error instanceof ApiClientError && error.error.code === ErrorCode.INVALID_TABLE_TOKEN) {
      return { kind: 'invalid-token' };
    }
    throw error;
  }

  const { table, outlet } = tableResult.value;
  if (outlet.slug !== slug) return { kind: 'wrong-outlet', slug: outlet.slug };
  if (menuResult.status === 'rejected') throw menuResult.reason;

  return { kind: 'ok', table, outlet, menu: menuResult.value };
}
