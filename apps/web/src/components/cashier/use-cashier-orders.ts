'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ErrorCode, SocketEvent } from 'shared';
import type { OrderStatus, OrderUpdatedEvent, PaymentUpdatedEvent, StaffOrderDto } from 'shared';
import { ApiClientError } from '@/lib/api';
import { todayWib, upsertOrder } from '@/lib/cashier-board';
import { connectRealtime } from '@/lib/socket';
import { refreshSession, staffFetch } from '@/lib/staff-api';

export interface OrderFilters {
  /** YYYY-MM-DD WIB */
  from: string;
  to: string;
  /** Kode pesanan atau label meja. */
  q: string;
}

/** Polling cadangan saat WebSocket putus. */
export const OFFLINE_POLL_MS = 15_000;
const QUERY_ROOT = 'cashier-orders';

/** Daftar "hari ini tanpa pencarian" bisa diperbarui langsung dari event; filter lain diambil ulang. */
const isLiveView = (f: OrderFilters) => f.from === todayWib() && f.to === todayWib() && !f.q;

function applyOrder(queryClient: QueryClient, order: StaffOrderDto) {
  for (const [key] of queryClient.getQueriesData<StaffOrderDto[]>({ queryKey: [QUERY_ROOT] })) {
    const filters = key[1] as OrderFilters;
    if (isLiveView(filters)) queryClient.setQueryData<StaffOrderDto[]>(key, (old) => upsertOrder(old, order));
    else void queryClient.invalidateQueries({ queryKey: key, exact: true });
  }
}

/**
 * Pesanan dashboard kasir (FR-008): GET /orders + room `outlet:<id>:cashier`. Event realtime langsung
 * memperbarui cache; setelah (re)connect daftar diambil ulang agar perubahan selama putus tidak hilang.
 */
export function useCashierOrders(filters: OrderFilters, options: { enabled: boolean; onNewOrder: (order: StaffOrderDto) => void }) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const onNewOrder = useRef(options.onNewOrder);
  useEffect(() => {
    onNewOrder.current = options.onNewOrder;
  }, [options.onNewOrder]);

  const params = new URLSearchParams({ from: filters.from, to: filters.to, ...(filters.q ? { q: filters.q } : {}) });
  const query = useQuery({
    queryKey: [QUERY_ROOT, filters],
    queryFn: () => staffFetch<StaffOrderDto[]>(`/orders?${params}`),
    enabled: options.enabled,
    refetchInterval: connected ? false : OFFLINE_POLL_MS,
  });

  useEffect(() => {
    if (!options.enabled) return;
    const socket = connectRealtime();
    socket.on('connect', () => {
      setConnected(true);
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOT] });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (error: Error & { data?: { code?: string } }) => {
      setConnected(false);
      // Access token kedaluwarsa: perbarui sesi lalu sambung ulang (middleware tidak reconnect sendiri).
      if (error.data?.code === ErrorCode.UNAUTHORIZED) {
        void refreshSession().then((ok) => {
          if (ok) socket.connect();
          else void queryClient.invalidateQueries({ queryKey: ['me'] });
        });
      }
    });
    socket.on(SocketEvent.ORDER_CREATED, (order: StaffOrderDto) => {
      applyOrder(queryClient, order);
      onNewOrder.current(order);
    });
    const onChange = (event: OrderUpdatedEvent | PaymentUpdatedEvent) => event.order && applyOrder(queryClient, event.order);
    socket.on(SocketEvent.ORDER_UPDATED, onChange);
    socket.on(SocketEvent.PAYMENT_UPDATED, onChange);
    return () => {
      socket.disconnect();
    };
  }, [options.enabled, queryClient]);

  return { query, connected };
}

export type OrderAction =
  | { kind: 'status'; status: OrderStatus }
  | { kind: 'paid' }
  | { kind: 'cancel'; reason: string };

/** Aksi kasir: ubah status, tandai lunas, batal. Hasil server langsung masuk cache. */
export function useOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OrderAction }) => {
      if (action.kind === 'status') {
        return staffFetch<StaffOrderDto>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: action.status }) });
      }
      if (action.kind === 'paid') return staffFetch<StaffOrderDto>(`/orders/${id}/mark-paid`, { method: 'POST', body: '{}' });
      return staffFetch<StaffOrderDto>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: action.reason }) });
    },
    onSuccess: (order) => applyOrder(queryClient, order),
    onError: (error) => {
      // Data basi (diubah kasir lain): ambil ulang agar tombol sesuai status terbaru.
      if (error instanceof ApiClientError && error.status === 409) void queryClient.invalidateQueries({ queryKey: [QUERY_ROOT] });
    },
  });
}
