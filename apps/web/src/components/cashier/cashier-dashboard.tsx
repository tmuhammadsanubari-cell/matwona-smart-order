'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffOrderDto } from 'shared';
import { useStaffSession } from '@/components/auth/use-staff-session';
import { Badge, Button, ConnectionBanner, cx, Logo, toast, Toaster, type BadgeTone } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { COLUMNS, groupByColumn, todayWib, type ColumnId } from '@/lib/cashier-board';
import { playNewOrderSound, readSoundPreference, unlockSound, writeSoundPreference } from '@/lib/notification-sound';
import { CancelOrderSheet } from './cancel-order-sheet';
import { OrderCard } from './order-card';
import { ThermalReceiptModal } from './thermal-receipt';
import { useCashierOrders, useOrderAction, type OrderAction, type OrderFilters } from './use-cashier-orders';

/** Lama sorotan kartu pesanan baru. */
export const HIGHLIGHT_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 300;

/** Warna penghitung kolom (desain K2): Baru merah, Diproses biru, Disajikan hijau, Selesai abu-abu. */
const COLUMN_TONE: Record<ColumnId, BadgeTone> = { new: 'danger-solid', process: 'info', served: 'primary', done: 'neutral' };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H3v6h3l5 4z" />
      {on ? <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

/** Tombol/label di header hijau (desain K2): latar cream transparan, teks cream. */
const HEADER_CHIP = 'inline-flex min-h-11 items-center gap-2 rounded-control bg-cream/10 px-3 text-[13px] font-bold text-cream';
const FIELD = 'min-h-11 rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-base text-ink focus:border-primary focus:outline-none';

/** Dashboard kasir realtime (FR-008, PRD 2.2.5). Hanya CASHIER & ADMIN. */
export function CashierDashboard() {
  const session = useStaffSession(['CASHIER', 'ADMIN']);
  const [filters, setFilters] = useState<OrderFilters>(() => ({ from: todayWib(), to: todayWib(), q: '' }));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ColumnId>('new');
  const [soundOn, setSoundOn] = useState(true);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<StaffOrderDto | null>(null);
  const [printingOrder, setPrintingOrder] = useState<StaffOrderDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const action = useOrderAction();

  useEffect(() => {
    // Preferensi dari localStorage hanya ada di browser; dibaca setelah mount agar render server = klien.
    const stored = readSoundPreference();
    const timer = setTimeout(() => setSoundOn(stored), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const onNewOrder = useCallback(
    (order: StaffOrderDto) => {
      if (soundOn) playNewOrderSound();
      toast(`Pesanan baru dari Meja ${order.table}`);
      setHighlighted((s) => new Set(s).add(order.id));
      setTimeout(() => setHighlighted((s) => {
        const next = new Set(s);
        next.delete(order.id);
        return next;
      }), HIGHLIGHT_MS);
    },
    [soundOn],
  );

  const ready = session.status === 'ready';
  const { query, connected } = useCashierOrders(filters, { enabled: ready, onNewOrder });

  const run = (order: StaffOrderDto, act: OrderAction, after?: () => void) => {
    setActionError(null);
    action.mutate(
      { id: order.id, action: act },
      {
        onSuccess: after,
        onError: (error) =>
          setActionError(error instanceof ApiClientError ? error.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'),
      },
    );
  };

  if (session.status === 'loading') {
    return <main className="min-h-dvh" aria-busy="true" aria-label="Memuat dashboard kasir" />;
  }
  if (session.status === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-ink">Dashboard belum bisa dimuat</h1>
        <Button onClick={session.retry}>Coba lagi</Button>
      </main>
    );
  }
  if (session.status === 'forbidden') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-ink">Akun ini tidak punya akses ke dashboard kasir.</h1>
      </main>
    );
  }

  const groups = groupByColumn(query.data ?? []);
  const toggleSound = () => {
    unlockSound();
    setSoundOn((on) => {
      writeSoundPreference(!on);
      return !on;
    });
  };

  const totalOrders = query.data?.length ?? 0;
  const isToday = filters.from === todayWib() && filters.to === todayWib();

  return (
    // Interaksi pertama mengizinkan audio (kebijakan autoplay browser).
    <main className="min-h-dvh pb-8" onPointerDown={unlockSound}>
      <Toaster />
      {!connected && <ConnectionBanner>Koneksi terputus, mencoba menyambung…</ConnectionBanner>}

      <header className="flex flex-wrap items-center gap-2 bg-primary px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-center gap-2.5">
          <Logo width={118} priority />
          <h1 className="border-l border-cream/40 pl-2.5 text-lg font-extrabold text-cream">Kasir</h1>
        </div>
        {connected && (
          <span className={cx(HEADER_CHIP, 'max-sm:hidden')}>
            <span aria-hidden="true" className="size-2.5 rounded-full bg-accent ring-3 ring-accent/30" />
            Terhubung
          </span>
        )}
        <button
          type="button"
          aria-pressed={soundOn}
          aria-label={`Suara notifikasi: ${soundOn ? 'Aktif' : 'Mati'}`}
          onClick={toggleSound}
          className={HEADER_CHIP}
        >
          <SoundIcon on={soundOn} />
          <span>
            <span className="max-sm:sr-only">Suara notifikasi: </span>
            {soundOn ? 'Aktif' : 'Mati'}
          </span>
        </button>
        <span className={HEADER_CHIP}>
          <span
            aria-hidden="true"
            className="flex size-6.5 items-center justify-center rounded-full bg-cream text-xs font-extrabold text-primary"
          >
            {initials(session.user.name)}
          </span>
          <span className="max-sm:sr-only">{session.user.name}</span>
        </span>
        <Button variant="inverse" onClick={() => void session.logout()}>
          Keluar
        </Button>
      </header>

      <section
        aria-label="Filter pesanan"
        className="flex flex-wrap items-end gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6"
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-bold text-ink">
          Cari kode / meja
          <span className={cx(FIELD, 'flex items-center gap-2 px-3 focus-within:border-primary')}>
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="mis. 0042 atau 5"
              className="min-w-0 flex-1 self-stretch bg-transparent font-normal focus:outline-none"
            />
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3 max-sm:w-full">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-ink">
          Dari
          <input
            type="date"
            value={filters.from}
            max={filters.to}
            onChange={(e) => e.target.value && setFilters((f) => ({ ...f, from: e.target.value }))}
            className={FIELD}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-ink">
          Sampai
          <input
            type="date"
            value={filters.to}
            min={filters.from}
            onChange={(e) => e.target.value && setFilters((f) => ({ ...f, to: e.target.value }))}
            className={FIELD}
          />
        </label>
        </div>
        {!isToday && (
          <Button variant="secondary" onClick={() => setFilters((f) => ({ ...f, from: todayWib(), to: todayWib() }))}>
            Hari ini
          </Button>
        )}
        <p className="flex min-h-11 items-center text-sm font-bold text-muted" aria-live="polite">
          {totalOrders} pesanan {isToday ? 'hari ini' : 'pada rentang ini'}
        </p>
      </section>

      {actionError && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-control border border-danger/30 bg-danger-soft p-3 text-sm font-semibold text-danger-strong sm:mx-6"
        >
          {actionError}
        </p>
      )}

      {/* HP/tablet kecil: satu kolom per tab. Layar lebar: empat kolom. */}
      <nav aria-label="Kolom pesanan" className="flex gap-2 overflow-x-auto px-4 pt-3 lg:hidden">
        {COLUMNS.map((column) => (
          <button
            key={column.id}
            type="button"
            aria-current={tab === column.id || undefined}
            onClick={() => setTab(column.id)}
            className={cx(
              'min-h-11 shrink-0 rounded-full px-4 text-sm font-bold',
              tab === column.id ? 'bg-primary text-primary-foreground' : 'border border-line bg-surface text-ink',
            )}
          >
            {column.title} ({groups[column.id].length})
          </button>
        ))}
      </nav>

      {query.isPending ? (
        <p className="p-4 text-muted sm:px-6">Memuat pesanan…</p>
      ) : query.isError && !query.data ? (
        <div className="flex flex-col items-start gap-2 p-4 sm:px-6">
          <p className="font-semibold text-danger">Pesanan belum bisa dimuat.</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-4.5 p-4 sm:p-6 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <section
              key={column.id}
              aria-labelledby={`kolom-${column.id}`}
              className={cx(
                'flex flex-col gap-3 rounded-[18px] bg-line/70 p-3',
                tab !== column.id && 'hidden lg:flex',
              )}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <h2 id={`kolom-${column.id}`} className="text-base font-extrabold text-ink">
                  {column.title}
                </h2>
                <Badge tone={COLUMN_TONE[column.id]} aria-label={`${groups[column.id].length} pesanan`}>
                  {groups[column.id].length}
                </Badge>
              </div>
              {groups[column.id].length === 0 ? (
                <p className="rounded-card border border-dashed border-line-strong p-4 text-center text-sm text-muted">
                  Belum ada pesanan.
                </p>
              ) : (
                groups[column.id].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    highlighted={highlighted.has(order.id)}
                    busy={action.isPending && action.variables?.id === order.id}
                    onAdvance={(status) => run(order, { kind: 'status', status })}
                    onMarkPaid={() => run(order, { kind: 'paid' })}
                    onCancel={() => setCancelling(order)}
                    onPrint={() => setPrintingOrder(order)}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}

      {printingOrder && (
        <ThermalReceiptModal
          order={printingOrder}
          onClose={() => setPrintingOrder(null)}
        />
      )}

      <CancelOrderSheet
        order={cancelling}
        busy={action.isPending && action.variables?.id === cancelling?.id}
        onClose={() => setCancelling(null)}
        onConfirm={(reason) => cancelling && run(cancelling, { kind: 'cancel', reason }, () => setCancelling(null))}
      />
    </main>
  );
}
