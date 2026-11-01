'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, CategoryInput, CategoryUpdateInput, MenuItemDto, MenuItemInput, MenuItemUpdateInput } from 'shared';
import { staffFetch } from '@/lib/staff-api';

const CATEGORIES = ['admin', 'categories'] as const;
const ITEMS = ['admin', 'menu-items'] as const;

export function useCategories() {
  return useQuery({ queryKey: CATEGORIES, queryFn: () => staffFetch<CategoryDto[]>('/categories') });
}

export function useMenuItems(archived: boolean) {
  return useQuery({
    queryKey: [...ITEMS, { archived }],
    queryFn: () => staffFetch<MenuItemDto[]>(`/menu-items?archived=${archived}`),
  });
}

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

/** Mutasi menu admin (FR-010). Setiap perubahan memuat ulang kategori (jumlah item) & daftar menu. */
export function useMenuAdminMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: CATEGORIES });
    void queryClient.invalidateQueries({ queryKey: ITEMS });
  };

  const createCategory = useMutation({
    mutationFn: (input: CategoryInput) => staffFetch<CategoryDto>('/categories', json('POST', input)),
    onSuccess,
  });
  const updateCategory = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      staffFetch<CategoryDto>(`/categories/${id}`, json('PUT', input)),
    onSuccess,
  });
  const deleteCategory = useMutation({
    mutationFn: (id: string) => staffFetch<null>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess,
  });
  const reorderCategories = useMutation({
    mutationFn: (ids: string[]) => staffFetch<CategoryDto[]>('/categories/reorder', json('PATCH', { ids })),
    onSuccess,
  });
  const createItem = useMutation({
    mutationFn: (input: MenuItemInput) => staffFetch<MenuItemDto>('/menu-items', json('POST', input)),
    onSuccess,
  });
  const updateItem = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MenuItemUpdateInput }) =>
      staffFetch<MenuItemDto>(`/menu-items/${id}`, json('PUT', input)),
    onSuccess,
  });
  const setAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      staffFetch<MenuItemDto>(`/menu-items/${id}/availability`, json('PATCH', { isAvailable })),
    onSuccess,
  });
  /** Foto menu (S2-11): multipart field `file`; validasi jenis & ukuran juga di server. */
  const uploadImage = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const body = new FormData();
      body.append('file', file);
      return staffFetch<MenuItemDto>(`/menu-items/${id}/image`, { method: 'POST', body });
    },
    onSuccess,
  });
  const removeImage = useMutation({
    mutationFn: (id: string) => staffFetch<MenuItemDto>(`/menu-items/${id}/image`, { method: 'DELETE' }),
    onSuccess,
  });
  const archiveItem = useMutation({
    mutationFn: (id: string) => staffFetch<MenuItemDto>(`/menu-items/${id}`, { method: 'DELETE' }),
    onSuccess,
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createItem,
    updateItem,
    setAvailability,
    uploadImage,
    removeImage,
    archiveItem,
  };
}
