'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffOrderDto } from 'shared';
import { useStaffSession } from '@/components/auth/use-staff-session';
import { Button, cx } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { COLUMNS, groupByColumn, todayWib, type ColumnId } from '@/lib/cashier-board';
import { playNewOrderSound, readSoundPreference, unlockSound, writeSoundPreference } from '@/lib/notification-sound';
import { CancelOrderSheet } from './cancel-order-sheet';
import { OrderCard } from './order-card';
import { useCashierOrders, useOrderAction, type OrderAction, type OrderFilters } from './use-cashier-orders';

/** Lama sorotan kartu pesanan baru. */
export const HIGHLIGHT_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 300;

/** Dashboard kasir realtime (FR-008, PRD 2.2.5). Hanya CASHIER & ADMIN. */
export function CashierDashboard() {
  const session = useStaffSession(['CASHIER', 'ADMIN']);
  const [filters, setFilters] = useState<OrderFilters>(() => ({ from: todayWib(), to: todayWib(), q: '' }));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ColumnId>('new');
  const [soundOn, setSoundOn] = useState(true);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<StaffOrderDto | null>(null);
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

  return (
    // Interaksi pertama mengizinkan audio (kebijakan autoplay browser).
    <main className="min-h-dvh pb-8" onPointerDown={unlockSound}>
      <header className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <h1 className="text-xl font-bold">Dashboard Kasir</h1>
          <p className="text-sm text-cream">{session.user.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="inverse" aria-pressed={soundOn} onClick={toggleSound}>
            {soundOn ? '🔔 Suara aktif' : '🔕 Suara mati'}
          </Button>
          <Button variant="inverse" onClick={() => void session.logout()}>
            Keluar
          </Button>
        </div>
      </header>

      {!connected && (
        <p role="status" className="bg-danger-soft px-4 py-2 text-sm font-semibold text-danger">
          Koneksi terputus, mencoba menyambung…
        </p>
      )}

      <section
        aria-label="Filter pesanan"
        className="grid grid-cols-2 items-end gap-3 border-b border-line bg-surface px-4 py-3 sm:flex sm:flex-wrap"
      >
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Dari
          <input
            type="date"
            value={filters.from}
            max={filters.to}
            onChange={(e) => e.target.value && setFilters((f) => ({ ...f, from: e.target.value }))}
            className="min-h-11 w-full rounded-xl border-2 border-line px-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Sampai
          <input
            type="date"
            value={filters.to}
            min={filters.from}
            onChange={(e) => e.target.value && setFilters((f) => ({ ...f, to: e.target.value }))}
            className="min-h-11 w-full rounded-xl border-2 border-line px-2 text-base"
          />
        </label>
        <label className="col-span-2 flex min-w-48 flex-1 flex-col gap-1 text-sm font-semibold text-ink">
          Cari kode / meja
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="mis. 0042 atau 5"
            className="min-h-11 rounded-xl border-2 border-line px-3 text-base font-normal"
          />
        </label>
        {(filters.from !== todayWib() || filters.to !== todayWib()) && (
          <Button variant="ghost" onClick={() => setFilters((f) => ({ ...f, from: todayWib(), to: todayWib() }))}>
            Hari ini
          </Button>
        )}
      </section>

      {actionError && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
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
              'min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
              tab === column.id ? 'bg-primary text-primary-foreground' : 'border border-line bg-surface text-ink',
            )}
          >
            {column.title} ({groups[column.id].length})
          </button>
        ))}
      </nav>

      {query.isPending ? (
        <p className="p-4 text-muted">Memuat pesanan…</p>
      ) : query.isError && !query.data ? (
        <div className="flex flex-col items-start gap-2 p-4">
          <p className="text-danger">Pesanan belum bisa dimuat.</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <section
              key={column.id}
              aria-labelledby={`kolom-${column.id}`}
              className={cx('flex flex-col gap-3', tab !== column.id && 'hidden lg:flex')}
            >
              <h2 id={`kolom-${column.id}`} className="font-bold text-ink">
                {column.title} <span className="text-muted">({groups[column.id].length})</span>
              </h2>
              {groups[column.id].length === 0 ? (
                <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-muted">Belum ada pesanan.</p>
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
                  />
                ))
              )}
            </section>
          ))}
        </div>
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
