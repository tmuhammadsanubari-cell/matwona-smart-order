'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { formatRupiah } from 'shared';
import type { PrintStationResult, SplitPrintTicket, StaffOrderDto } from 'shared';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { Badge, Button, toast } from '@/components/ui';

export interface ThermalReceiptModalProps {
  order: StaffOrderDto;
  onClose: () => void;
}

const formatWibTimestamp = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const buildFallbackCashierTicket = (order: StaffOrderDto): SplitPrintTicket => {
  const lines = [
    'MATWONA - TUNA & AYAM KAMPUNG',
    `Order   : ${order.orderCode}`,
    `Meja    : ${order.table || '-'}`,
    `Nama    : ${order.customerName}`,
    `Waktu   : ${formatWibTimestamp(order.createdAt)} WIB`,
    '--------------------------------',
    ...order.items.flatMap((it) => [
      `${it.quantity}x ${it.name}  ${formatRupiah(it.lineTotal)}`,
      ...(it.note ? [`   Catatan: ${it.note}`] : []),
    ]),
    '--------------------------------',
    ...(order.discountAmount > 0
      ? [`Subtotal: ${formatRupiah(order.subtotalAmount)}`, `Diskon  : -${formatRupiah(order.discountAmount)}`]
      : []),
    `TOTAL   : ${formatRupiah(order.totalAmount)}`,
    `Bayar   : ${order.paymentMethod === 'QRIS' ? 'QRIS' : 'Kasir'} (${order.paymentStatus})`,
  ];

  return {
    stationId: 'cashier',
    stationName: 'Kasir Depan',
    type: 'BROWSER',
    orderCode: order.orderCode,
    table: order.table,
    customerName: order.customerName,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    serviceMode: 'SELF_PICKUP_PAGER',
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      note: it.note,
      categoryName: 'Menu',
    })),
    plainText: lines.join('\n'),
  };
};

const STATION_TYPE_LABEL: Record<SplitPrintTicket['type'], string> = {
  BROWSER: 'Browser / USB',
  NETWORK_LAN: 'LAN (TCP 9100)',
  BLUETOOTH: 'Bluetooth / Browser',
};

export function ThermalReceiptModal({ order, onClose }: ThermalReceiptModalProps) {
  const [selectedStationId, setSelectedStationId] = useState<string>('cashier');
  const [printResults, setPrintResults] = useState<PrintStationResult[] | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['order-tickets', order.id],
    queryFn: () => staffFetch<SplitPrintTicket[]>(`/orders/${order.id}/tickets`),
    retry: false,
  });

  const tickets = useMemo(() => {
    const serverTickets = ticketsQuery.data;
    if (serverTickets && serverTickets.length > 0) return serverTickets;
    return [buildFallbackCashierTicket(order)];
  }, [order, ticketsQuery.data]);

  const activeTicket =
    tickets.find((t) => t.stationId === selectedStationId) ?? tickets[0]!;

  const lanPrintMutation = useMutation({
    mutationFn: (stationId?: string) =>
      staffFetch<PrintStationResult[]>(`/orders/${order.id}/print`, {
        method: 'POST',
        body: JSON.stringify(stationId ? { stationId } : {}),
      }),
    onSuccess: (results) => {
      setPrintResults(results);
      const okCount = results.filter((r) => r.success).length;
      if (okCount === results.length) {
        toast(`Tiket berhasil diproses (${okCount} stasiun)`);
      } else {
        toast(`${okCount}/${results.length} stasiun cetak berhasil`);
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal mengirim perintah cetak.';
      toast(msg);
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeTicket.plainText);
      toast(`Teks tiket ${activeTicket.stationName} disalin`);
    } catch {
      toast('Gagal menyalin teks tiket');
    }
  };

  const hasLanTicket = tickets.some((t) => t.type === 'NETWORK_LAN');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thermal-receipt-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-sheet bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="thermal-receipt-title" className="text-lg font-extrabold text-ink">
              Cetak Struk & Tiket Stasiun
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Pilih stasiun (Kasir / Dapur / Bar) untuk cetak browser/Bluetooth atau kirim langsung ke printer LAN.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>

        {/* Tab Stasiun Split-Print */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Pilih tiket stasiun">
          {tickets.map((t) => {
            const active = t.stationId === activeTicket.stationId;
            return (
              <button
                key={t.stationId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedStationId(t.stationId)}
                className={`rounded-control border px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-cream'
                    : 'border-line bg-cream text-ink hover:bg-primary-soft'
                }`}
              >
                {t.stationName} ({t.items.length})
              </button>
            );
          })}
        </div>

        {/* Info tipe printer aktif */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Badge tone={activeTicket.type === 'NETWORK_LAN' ? 'info' : 'neutral'}>
              {STATION_TYPE_LABEL[activeTicket.type]}
            </Badge>
            {activeTicket.type === 'NETWORK_LAN' && activeTicket.host && (
              <span className="font-mono text-[11px]">
                {activeTicket.host}:{activeTicket.port ?? 9100}
              </span>
            )}
          </div>
          {activeTicket.serviceMode === 'SELF_PICKUP_PAGER' && (
            <span className="font-semibold text-primary">Mode: Pager Self-Pickup</span>
          )}
        </div>

        {/* Kertas Preview Struk Thermal (dicetak saat window.print) */}
        <div className="mt-3 flex-1 overflow-y-auto rounded-card border border-line bg-cream/60 p-3">
          <div
            id="thermal-receipt-paper"
            className="mx-auto w-full max-w-[300px] rounded bg-white p-4 font-mono text-xs leading-relaxed text-black shadow-sm"
          >
            <div className="border-b border-dashed border-neutral-400 pb-2 text-center">
              <p className="text-sm font-bold tracking-wide">MATWONA</p>
              <p className="text-[11px] font-bold uppercase">
                {activeTicket.stationId === 'cashier'
                  ? 'STRUK KASIR'
                  : `TIKET ${activeTicket.stationName.toUpperCase()}`}
              </p>
            </div>

            <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[11px]">
              <div className="flex justify-between">
                <span>Kode</span>
                <span className="font-bold">{activeTicket.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Meja/Antrean</span>
                <span className="font-bold">{activeTicket.table || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span>{activeTicket.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{formatWibTimestamp(activeTicket.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-neutral-400 py-2">
              {activeTicket.items.map((item, idx) => (
                <div key={`${item.name}-${idx}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">
                      {item.quantity}x {item.name}
                    </span>
                    {activeTicket.stationId === 'cashier' && (
                      <span className="shrink-0">{formatRupiah(item.lineTotal)}</span>
                    )}
                  </div>
                  {item.note && (
                    <p className="pl-3 text-[11px] italic">* {item.note}</p>
                  )}
                </div>
              ))}
            </div>

            {activeTicket.stationId === 'cashier' && activeTicket.totalAmount !== undefined ? (
              <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[11px]">
                {activeTicket.discountAmount && activeTicket.discountAmount > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah(activeTicket.subtotalAmount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diskon Promo</span>
                      <span>-{formatRupiah(activeTicket.discountAmount)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between pt-0.5 text-xs font-bold">
                  <span>TOTAL</span>
                  <span>{formatRupiah(activeTicket.totalAmount)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Pembayaran</span>
                  <span>
                    {activeTicket.paymentMethod === 'QRIS' ? 'QRIS' : 'Kasir'} ({activeTicket.paymentStatus})
                  </span>
                </div>
              </div>
            ) : null}

            <div className="pt-2 text-center text-[10px]">
              {activeTicket.stationId === 'cashier'
                ? 'Terima kasih telah makan di Matwona'
                : `Siapkan pesanan sesuai tiket ${activeTicket.stationName}`}
            </div>
          </div>
        </div>

        {/* Status pengiriman LAN printer */}
        {printResults && (
          <div className="mt-2.5 space-y-1 rounded-card border border-line bg-cream/70 p-2.5 text-xs">
            {printResults.map((res) => (
              <div key={res.stationId} className="flex items-start justify-between gap-2">
                <span className="font-bold text-ink">{res.stationName}:</span>
                <span className={res.success ? 'text-primary' : 'text-danger'}>
                  {res.message}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            Salin Teks
          </Button>
          {(hasLanTicket || activeTicket.type === 'NETWORK_LAN') && (
            <Button
              type="button"
              variant="secondary"
              loading={lanPrintMutation.isPending}
              onClick={() =>
                lanPrintMutation.mutate(
                  activeTicket.type === 'NETWORK_LAN' ? activeTicket.stationId : undefined,
                )
              }
            >
              Kirim ke Printer LAN
            </Button>
          )}
          <Button type="button" variant="primary" onClick={handlePrint}>
            Cetak Struk
          </Button>
        </div>
      </div>
    </div>
  );
}
