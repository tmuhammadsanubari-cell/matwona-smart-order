'use client';

import { useState } from 'react';
import { formatRupiah } from 'shared';
import { Card } from '@/components/ui';

export function AnalyticsAdmin() {
  const [dateRange, setDateRange] = useState({ from: '2026-11-01', to: '2026-11-11' });

  return (
    <div className="flex flex-col gap-6">
      {/* Date Filters */}
      <section
        aria-label="Filter periode analitik"
        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-muted">
            Dari:
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="ml-2 rounded-control border border-line-strong bg-surface px-2.5 py-1 text-sm font-semibold text-ink"
            />
          </label>
          <span className="text-xs font-bold text-muted">—</span>
          <label className="text-xs font-bold text-muted">
            Sampai:
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="ml-2 rounded-control border border-line-strong bg-surface px-2.5 py-1 text-sm font-semibold text-ink"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateRange({ from: '2026-11-11', to: '2026-11-11' })}
            className="rounded-control border border-primary bg-cream px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setDateRange({ from: '2026-11-04', to: '2026-11-11' })}
            className="rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            7 Hari Terakhir
          </button>
        </div>
      </section>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Total Pendapatan</span>
          <span className="text-2xl font-black text-ink">{formatRupiah(4870000)}</span>
          <span className="text-xs font-bold text-success">↑ 12,3% dari minggu lalu</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Jumlah Pesanan</span>
          <span className="text-2xl font-black text-ink">247</span>
          <span className="text-xs font-bold text-success">↑ 8,1% pesanan selesai</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Rata-rata Keranjang</span>
          <span className="text-2xl font-black text-ink">{formatRupiah(19717)}</span>
          <span className="text-xs font-bold text-success">↑ 3,8% nilai belanja</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Pesanan Dibatalkan</span>
          <span className="text-2xl font-black text-ink">7</span>
          <span className="text-xs font-semibold text-muted">2,8% rasio pembatalan</span>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Order Trend */}
        <Card className="flex flex-col gap-4">
          <h2 className="text-base font-extrabold text-ink">Tren Penjualan Harian</h2>
          <div className="flex h-44 items-end gap-3 px-2">
            {[
              { day: 'Sen', val: 38, pct: 76, color: 'bg-primary' },
              { day: 'Sel', val: 42, pct: 84, color: 'bg-primary' },
              { day: 'Rab', val: 35, pct: 70, color: 'bg-primary' },
              { day: 'Kam', val: 40, pct: 80, color: 'bg-primary' },
              { day: 'Jum', val: 52, pct: 100, color: 'bg-accent' },
              { day: 'Sab', val: 48, pct: 92, color: 'bg-primary' },
              { day: 'Min', val: 32, pct: 64, color: 'bg-primary' },
            ].map((col) => (
              <div key={col.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink">{col.val}</span>
                <div className="flex h-32 w-full max-w-[36px] items-end rounded-t-md bg-line/60">
                  <div
                    className={`w-full rounded-t-md ${col.color} transition-all duration-500`}
                    style={{ height: `${col.pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-muted">{col.day}</span>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted">
            📌 Hari <strong className="text-primary">Jumat</strong> mencatat volume pesanan tertinggi (+30% paket olahan tuna).
          </p>
        </Card>

        {/* Payment Methods */}
        <Card className="flex flex-col gap-4">
          <h2 className="text-base font-extrabold text-ink">Metode Pembayaran</h2>
          <div className="flex items-center justify-center py-2">
            <div className="relative flex size-40 items-center justify-center rounded-full bg-[conic-gradient(#106F4D_0%_45%,#069D70_45%_72%,#7A4A00_72%_88%,#D5DCCB_88%_100%)] shadow-inner">
              <div className="flex size-24 flex-col items-center justify-center rounded-full bg-surface shadow-sm">
                <span className="text-xl font-black text-ink">247</span>
                <span className="text-[10px] font-bold text-muted">transaksi</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-primary" />
              <span>Kasir (Tunai): 45%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-accent" />
              <span>QRIS Dinamis: 27%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-warning" />
              <span>Impor Olsera: 16%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-line-strong" />
              <span>Lainnya: 12%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top 5 Menu Terlaris */}
      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-extrabold text-ink">Menu Terlaris Periode Ini</h2>
        <div className="flex flex-col divide-y divide-line">
          {[
            { rank: 1, name: 'Tuna Sambal Matah (Reguler)', qty: 67, rev: 1273000, pct: 100 },
            { rank: 2, name: 'Tuna Sambal Matah (Jumbo)', qty: 54, rev: 1566000, pct: 81 },
            { rank: 3, name: 'Bakmie Tuna Sambal Matah', qty: 38, rev: 1444000, pct: 57 },
            { rank: 4, name: 'Es Teh Matwona', qty: 31, rev: 310000, pct: 46 },
            { rank: 5, name: 'Nasi Telur Barendo', qty: 28, rev: 364000, pct: 42 },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-7 items-center justify-center rounded-lg text-xs font-black ${
                    item.rank === 1
                      ? 'bg-primary text-primary-foreground'
                      : item.rank === 2
                      ? 'bg-accent text-primary-foreground'
                      : item.rank === 3
                      ? 'bg-warning-soft text-warning'
                      : 'bg-neutral-soft text-neutral'
                  }`}
                >
                  {item.rank}
                </span>
                <div>
                  <p className="font-bold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.qty} porsi terjual · <strong className="text-primary">{formatRupiah(item.rev)}</strong>
                  </p>
                </div>
              </div>
              <div className="hidden w-36 sm:block">
                <div className="h-2 w-full rounded-full bg-line">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
