'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ErrorCode, formatRupiah, PAYMENT_STATUS_LABEL, SocketEvent } from 'shared';
import type { OrderUpdatedEvent, PaymentUpdatedEvent, PublicOrderDto } from 'shared';
import { Badge, Button, buttonClassName, Card, cx } from '@/components/ui';
import { ApiClientError, apiFetch } from '@/lib/api';
import { orderProgress } from '@/lib/order-progress';
import { markOrderDone, parsePlacedOrders, readPlacedOrdersRaw, subscribePlacedOrders } from '@/lib/placed-orders';
import { connectRealtime } from '@/lib/socket';

/** Polling saat WebSocket putus (PRD 2.2.4). */
export const POLL_INTERVAL_MS = 10_000;

const PAYMENT_TONE = { PAID: 'success', UNPAID: 'danger', PENDING: 'neutral', FAILED: 'danger', EXPIRED: 'danger' } as const;

export interface OrderStatusViewProps {
  outlet: string;
  code: string;
}

/**
 * Status pesanan pelanggan (FR-007): realtime via room `order:<code>`, polling 10 detik saat koneksi
 * putus. Hanya bisa dibuka dari perangkat yang memesan (kode + token meja yang cocok, PRD 2.2.4).
 */
export function OrderStatusView({ outlet, code }: OrderStatusViewProps) {
  const queryClient = useQueryClient();
  // Server: undefined (localStorage belum ada) → render pertama klien sama, lalu dibaca dari storage.
  const raw = useSyncExternalStore(subscribePlacedOrders, readPlacedOrdersRaw, () => undefined);
  // undefined = belum dibaca; null = pesanan tidak dibuat dari perangkat ini.
  const placed = useMemo(
    () => (raw === undefined ? undefined : (parsePlacedOrders(raw).find((o) => o.code === code) ?? null)),
    [raw, code],
  );
  const [connected, setConnected] = useState(false);

  const query = useQuery({
    queryKey: ['order', code],
    queryFn: () => apiFetch<PublicOrderDto>(`/public/orders/${encodeURIComponent(code)}`, { tableToken: placed!.tableToken, cache: 'no-store' }),
    enabled: Boolean(placed),
    refetchInterval: connected ? false : POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!placed) return;
    const socket = connectRealtime({ tableToken: placed.tableToken, orderCode: code });
    const patch = (changes: Partial<PublicOrderDto>) =>
      queryClient.setQueryData<PublicOrderDto>(['order', code], (old) => (old ? { ...old, ...changes } : old));

    socket.on('connect', () => {
      setConnected(true);
      // Ambil ulang setelah (re)connect agar perubahan selama putus tidak terlewat.
      void queryClient.invalidateQueries({ queryKey: ['order', code] });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on(SocketEvent.ORDER_UPDATED, (event: OrderUpdatedEvent) => patch({ status: event.status }));
    socket.on(SocketEvent.PAYMENT_UPDATED, (event: PaymentUpdatedEvent) => patch({ paymentStatus: event.paymentStatus }));
    return () => {
      socket.disconnect();
    };
  }, [placed, code, queryClient]);

  const order = query.data;
  const progress = order ? orderProgress(order) : null;

  useEffect(() => {
    if (progress?.final) markOrderDone(code);
  }, [progress?.final, code]);

  if (placed === undefined || (placed && query.isPending)) {
    return <main className="mx-auto min-h-dvh max-w-md bg-cream" aria-busy="true" aria-label="Memuat status pesanan" />;
  }

  const notFound =
    placed === null || (query.error instanceof ApiClientError && query.error.error.code === ErrorCode.NOT_FOUND);
  if (notFound || (!order && query.error)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-ink">{notFound ? 'Pesanan tidak ditemukan di perangkat ini' : 'Status pesanan belum bisa dimuat'}</h1>
        <p className="text-muted">
          {notFound
            ? 'Status pesanan hanya bisa dibuka dari HP yang dipakai memesan. Tanyakan ke kasir dengan menyebut kode pesananmu.'
            : 'Periksa koneksi internetmu, lalu coba lagi.'}
        </p>
        {!notFound && (
          <Button size="lg" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        )}
      </main>
    );
  }

  if (!order || !progress || !placed) return null;
  const menuHref = `/m/${outlet}/t/${encodeURIComponent(placed.tableToken)}`;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-8">
      <header className="bg-primary px-4 pt-4 pb-5 text-primary-foreground">
        <p className="text-sm text-cream">Meja {order.table}</p>
        <h1 className="text-2xl font-bold">
          Pesanan <span className="whitespace-nowrap">{order.orderCode}</span>
        </h1>
      </header>

      {!connected && !progress.final && (
        <p role="status" className="bg-line px-4 py-2 text-sm text-ink">
          Koneksi terputus, mencoba menyambung… Status tetap diperbarui tiap 10 detik.
        </p>
      )}

      <div className="flex flex-col gap-4 p-4">
        <Card className="flex flex-col gap-4">
          <p className="text-lg font-bold text-ink" aria-live="polite">
            {progress.headline}
          </p>
          {progress.steps.length > 0 && (
            <ol className="flex flex-col gap-3" aria-label="Progres pesanan">
              {progress.steps.map((step) => (
                <li key={step.label} className="flex items-center gap-3" aria-current={step.state === 'current' ? 'step' : undefined}>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                      step.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                      step.state === 'current' && 'border-primary bg-primary-soft text-primary',
                      step.state === 'todo' && 'border-line bg-surface text-muted',
                    )}
                  >
                    {step.state === 'done' ? '✓' : ''}
                  </span>
                  <span className={cx(step.state === 'todo' ? 'text-muted' : 'font-semibold text-ink')}>{step.label}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-ink">Pembayaran</h2>
            <Badge tone={PAYMENT_TONE[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
          </div>
          <p className="text-sm text-muted">
            {order.paymentMethod === 'CASHIER'
              ? order.paymentStatus === 'PAID'
                ? 'Sudah dibayar di kasir. Terima kasih!'
                : `Bayar di kasir sebesar ${formatRupiah(order.totalAmount)} dengan menyebut kode pesananmu.`
              : 'QRIS'}
          </p>
        </Card>

        <Card>
          <h2 className="mb-2 font-bold text-ink">Rincian</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {order.items.map((item) => (
              <li key={item.menuItemId + (item.note ?? '')} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {item.name} × {item.quantity}
                  </p>
                  {item.note && <p className="text-muted">Catatan: {item.note}</p>}
                </div>
                <p className="shrink-0">{formatRupiah(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-bold text-ink">
            <span>Total</span>
            <span>{formatRupiah(order.totalAmount)}</span>
          </div>
        </Card>

        <Link href={menuHref} className={buttonClassName({ variant: 'secondary', fullWidth: true })}>
          Pesan menu lain
        </Link>
      </div>
    </main>
  );
}
