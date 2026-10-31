'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { AuthUser, UserRole } from 'shared';
import { apiFetch } from '@/lib/api';
import { isUnauthorized, staffFetch } from '@/lib/staff-api';

export type StaffSession =
  | { status: 'loading' }
  | { status: 'forbidden'; user: AuthUser }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; user: AuthUser; logout: () => Promise<void> };

/**
 * Sesi staf untuk halaman kasir/admin (FR-009): GET /auth/me (dengan refresh otomatis); belum login
 * atau sesi habis → /login?next=<halaman ini>. Role di luar `roles` → "forbidden".
 */
export function useStaffSession(roles: UserRole[]): StaffSession {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => staffFetch<AuthUser>('/auth/me'),
    retry: (count, error) => !isUnauthorized(error) && count < 1,
    staleTime: 60_000,
  });

  const unauthorized = me.isError && isUnauthorized(me.error);
  useEffect(() => {
    if (unauthorized) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthorized, router, pathname]);

  if (me.isPending || unauthorized) return { status: 'loading' };
  if (me.isError) return { status: 'error', retry: () => void me.refetch() };
  if (!roles.includes(me.data.role)) return { status: 'forbidden', user: me.data };

  return {
    status: 'ready',
    user: me.data,
    logout: async () => {
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
      queryClient.clear();
      router.replace('/login');
    },
  };
}
