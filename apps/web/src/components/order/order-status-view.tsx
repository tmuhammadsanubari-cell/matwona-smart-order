'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ErrorCode, formatRupiah, PAYMENT_STATUS_LABEL, SocketEvent } from 'shared';
import type { OrderUpdatedEvent, PaymentUpdatedEvent, PublicOrderDto } from 'shared';
import { BADGE_TONES, Button, Card, ConnectionBanner, cx, Logo, ProgressSteps, type ProgressStep } from '@/components/ui';
import { ApiClientError, apiFetch } from '@/lib/api';
import { timeWib } from '@/lib/cashier-board';
import { orderProgress } from '@/lib/order-progress';
import { markOrderDone, parsePlacedOrders, readPlacedOrdersRaw, subscribePlacedOrders } from '@/lib/placed-orders';
import { connectRealtime } from '@/lib/socket';
import { PAYMENT_STATUS_TONE } from '@/lib/status-tone';
import { BowlIllustration } from './illustrations';

/** Polling saat WebSocket putus (PRD 2.2.4). */
export const POLL_INTERVAL_MS = 10_000;

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
        <Logo variant="green" width={120} />
        <h1 className="mt-4 text-xl font-extrabold text-primary">{notFound ? 'Pesanan tidak ditemukan di perangkat ini' : 'Status pesanan belum bisa dimuat'}</h1>
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
  const currentIndex = progress.steps.findIndex((step) => step.state === 'current');
  const steps: ProgressStep[] = progress.steps.map((step, index) => ({
    ...step,
    // API publik hanya punya waktu pesanan dibuat; langkah lain tanpa jam.
    time: index === 0 ? timeWib(order.createdAt) : step.state === 'current' ? 'Sekarang' : step.state === 'todo' && index === currentIndex + 1 ? 'Sebentar lagi' : undefined,
  }));

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-8">
      {!connected && !progress.final && (
        <ConnectionBanner>Koneksi terputus, mencoba menyambung… Status tetap diperbarui tiap 10 detik.</ConnectionBanner>
      )}

      <header className="flex flex-col gap-1 bg-primary px-4 pt-[18px] pb-[22px] text-primary-foreground">
        <Logo width={96} className="mb-2" />
        <h1 className="text-lg font-extrabold">
          Pesanan <span className="whitespace-nowrap">{order.orderCode}</span>
        </h1>
        <p className="text-sm font-semibold text-cream">
          Meja {order.table} · {order.customerName}
        </p>
      </header>

      <div className="-mt-1.5 flex flex-col gap-3.5 p-4">
        <section className="flex flex-col items-center gap-2 rounded-sheet border-[1.5px] border-primary bg-cream p-5 text-center">
          {order.status !== 'CANCELLED' && <BowlIllustration />}
          <p className="text-xl leading-snug font-extrabold text-primary" aria-live="polite">
            {progress.headline}
          </p>
          <p className="text-sm text-muted">{progress.subline}</p>
        </section>

        <div className="flex flex-col gap-1.5">
          <p
            className={cx(
              'inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[13px] font-extrabold',
              BADGE_TONES[PAYMENT_STATUS_TONE[order.paymentStatus]],
            )}
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-current" />
            <span>
              <span>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span> · {order.paymentMethod === 'CASHIER' ? 'Kasir' : 'QRIS'}
            </span>
          </p>
          <p className="text-sm text-muted">
            {order.paymentMethod === 'CASHIER'
              ? order.paymentStatus === 'PAID'
                ? 'Sudah dibayar di kasir. Terima kasih!'
                : `Bayar di kasir sebesar ${formatRupiah(order.totalAmount)} dengan menyebut kode pesananmu.`
              : order.paymentStatus === 'PAID'
                ? 'Pembayaran QRIS berhasil diterima. Terima kasih!'
                : `Scan kode QRIS di bawah sebesar ${formatRupiah(order.totalAmount)} lalu konfirmasi ke kasir saat disajikan.`}
          </p>
        </div>

        {order.paymentMethod === 'QRIS' && order.paymentStatus !== 'PAID' && (
          <Card className="flex flex-col items-center gap-3 border-2 border-primary/30 p-5 text-center bg-white shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded">QRIS</span>
              <span className="text-xs font-bold text-muted">Pembayaran Digital Instan</span>
            </div>

            <div className="relative rounded-xl border-2 border-primary/20 p-4 bg-[#FFFFCA]/20">
              <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary">
                <rect x="2" y="2" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="4.5" y="4.5" width="2" height="2" fill="currentColor" />
                <rect x="15" y="2" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="17.5" y="4.5" width="2" height="2" fill="currentColor" />
                <rect x="2" y="15" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="4.5" y="17.5" width="2" height="2" fill="currentColor" />
                <path d="M14 14h3v3h-3z" fill="currentColor" />
                <path d="M19 14h2v2h-2z" fill="currentColor" />
                <path d="M14 19h2v2h-2z" fill="currentColor" />
                <path d="M18 18h3v3h-3z" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-muted">Nominal Pembayaran</span>
              <span className="font-mono text-xl font-black text-primary">{formatRupiah(order.totalAmount)}</span>
            </div>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              Buka aplikasi GoPay, OVO, Dana, BCA, Livin&apos;, ShopeePay, atau m-Banking untuk scan QRIS di atas.
            </p>
          </Card>
        )}

        {steps.length > 0 && (
          <Card className="pb-1.5">
            <ProgressSteps steps={steps} orientation="vertical" aria-label="Progres pesanan" />
          </Card>
        )}

        <Card className="flex flex-col gap-2.5 text-sm">
          <h2 className="text-[15px] font-extrabold text-ink">Detail pesanan</h2>
          <ul className="flex flex-col gap-2.5">
            {order.items.map((item) => (
              <li key={item.menuItemId + (item.note ?? '')} className="flex flex-col gap-0.5">
                <div className="flex justify-between gap-3">
                  <p className="min-w-0 text-ink">
                    {item.quantity}× {item.name}
                  </p>
                  <p className="shrink-0 font-bold whitespace-nowrap">{formatRupiah(item.lineTotal)}</p>
                </div>
                {item.note && <p className="text-xs break-words text-muted italic">Catatan: {item.note}</p>}
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1.5 border-t border-line pt-2.5">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-bold">{formatRupiah(order.subtotalAmount)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Diskon</dt>
                <dd className="font-bold text-primary">−{formatRupiah(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-[17px]">
              <dt className="font-extrabold">Total</dt>
              <dd className="font-extrabold">{formatRupiah(order.totalAmount)}</dd>
            </div>
          </dl>
        </Card>

        <Link
          href={menuHref}
          className="inline-flex min-h-11 items-center self-center px-3 text-[15px] font-bold text-primary hover:text-primary-hover"
        >
          Kembali ke menu
        </Link>
      </div>
    </main>
  );
}
