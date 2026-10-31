'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTablesInput, DiningTableDto, UpdateTableInput } from 'shared';
import { staffFetch } from '@/lib/staff-api';

const TABLES = ['admin', 'tables'] as const;
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export function useTables() {
  return useQuery({ queryKey: TABLES, queryFn: () => staffFetch<DiningTableDto[]>('/tables') });
}

/** Mutasi meja (FR-011). Setiap perubahan memuat ulang daftar meja. */
export function useTablesMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: TABLES });

  const create = useMutation({
    mutationFn: (input: CreateTablesInput) => staffFetch<DiningTableDto[]>('/tables', json('POST', input)),
    onSuccess,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTableInput }) => staffFetch<DiningTableDto>(`/tables/${id}`, json('PUT', input)),
    onSuccess,
  });
  const regenerate = useMutation({
    mutationFn: (id: string) => staffFetch<DiningTableDto>(`/tables/${id}/regenerate-token`, json('POST', {})),
    onSuccess,
  });

  return { create, update, regenerate };
}
