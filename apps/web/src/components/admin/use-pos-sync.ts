'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PosColumnMapping, PosSyncLogDto, PosSyncPreviewDto } from 'shared';
import { staffFetch } from '@/lib/staff-api';

const MAPPING = ['admin', 'pos-sync', 'mapping', 'PRODUCT'] as const;
const HISTORY = ['admin', 'pos-sync', 'history'] as const;

/** Pemetaan kolom tersimpan untuk impor produk (default server bila belum pernah disimpan). */
export function useProductMapping() {
  return useQuery({
    queryKey: MAPPING,
    queryFn: () => staffFetch<Record<string, string>>('/pos-sync/mapping?entity=PRODUCT'),
  });
}

/** Riwayat sinkronisasi (pos_sync_logs, FR-014). */
export function useSyncHistory() {
  return useQuery({ queryKey: HISTORY, queryFn: () => staffFetch<PosSyncLogDto[]>('/pos-sync/history') });
}

/** Muat ulang riwayat setelah proses di luar mutasi (mis. unduh CSV ekspor). */
export function useRefreshSyncHistory() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: HISTORY });
}

export function usePosSyncMutations() {
  const queryClient = useQueryClient();
  const refreshHistory = () => void queryClient.invalidateQueries({ queryKey: HISTORY });

  const saveMapping = useMutation({
    mutationFn: (mapping: PosColumnMapping) =>
      staffFetch<Record<string, string>>('/pos-sync/mapping', {
        method: 'PUT',
        body: JSON.stringify({ entity: 'PRODUCT', mapping }),
      }),
    onSuccess: (saved) => queryClient.setQueryData(MAPPING, saved),
  });

  const preview = useMutation({
    mutationFn: ({ file, mapping }: { file: File; mapping: PosColumnMapping }) => {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('columnMapping', JSON.stringify(mapping));
      return staffFetch<PosSyncPreviewDto>('/pos-sync/preview', { method: 'POST', body: form });
    },
    onSuccess: refreshHistory,
  });

  const apply = useMutation({
    mutationFn: (logId: string) =>
      staffFetch<{ applied: number }>('/pos-sync/apply', { method: 'POST', body: JSON.stringify({ logId }) }),
    onSuccess: () => {
      refreshHistory();
      // Impor bisa menambah kategori & mengubah item di halaman Menu admin.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
    },
  });

  return { saveMapping, preview, apply };
}
