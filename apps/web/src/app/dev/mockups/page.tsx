'use client';

import { useState } from 'react';
import { Logo } from '@/components/ui';

type MockTab = 'analytics' | 'promos' | 'reco' | 'staff' | 'receipt';

export default function DevMockupsPage() {
  const [activeTab, setActiveTab] = useState<MockTab>('analytics');

  return (
    <div className="min-h-screen bg-[#FFFFCA] text-[#1F2A24] antialiased">
      {/* Top Navbar Switcher */}
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-[#1F2A24] px-6 py-3.5 text-xs font-bold text-[#FFFFCA] shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-base font-black tracking-wider text-[#FFFFCA]">
            MAT<span className="text-[#069D70]">TWO</span>NA
          </span>
          <span className="rounded-md border border-[#069D70]/40 bg-[#069D70]/20 px-2 py-0.5 text-[11px] font-extrabold text-[#069D70]">
            DESIGN MOCKUP PREVIEW
          </span>
        </div>

        {/* Tab switcher buttons */}
        <nav className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#FFFFCA] text-[#106F4D] shadow-sm'
                : 'bg-white/10 text-[#FFFFCA] hover:bg-white/20'
            }`}
          >
            📊 Analitik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('promos')}
            className={`rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === 'promos'
                ? 'bg-[#FFFFCA] text-[#106F4D] shadow-sm'
                : 'bg-white/10 text-[#FFFFCA] hover:bg-white/20'
            }`}
          >
            🏷️ Promo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reco')}
            className={`rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === 'reco'
                ? 'bg-[#FFFFCA] text-[#106F4D] shadow-sm'
                : 'bg-white/10 text-[#FFFFCA] hover:bg-white/20'
            }`}
          >
            🤖 Rekomendasi AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === 'staff'
                ? 'bg-[#FFFFCA] text-[#106F4D] shadow-sm'
                : 'bg-white/10 text-[#FFFFCA] hover:bg-white/20'
            }`}
          >
            👥 Staf
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === 'receipt'
                ? 'bg-[#FFFFCA] text-[#106F4D] shadow-sm'
                : 'bg-white/10 text-[#FFFFCA] hover:bg-white/20'
            }`}
          >
            🧾 Struk Kasir
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <div className="mx-auto flex max-w-7xl min-h-[calc(100vh-60px)]">
        {/* Mock Admin Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-[#106F4D] p-6 lg:flex">
          <div className="flex items-center gap-2">
            <Logo width={110} />
            <span className="rounded border border-[#FFFFCA]/40 px-1.5 py-0.5 text-[11px] font-extrabold text-[#FFFFCA]">
              Admin
            </span>
          </div>

          <nav className="flex flex-col gap-1.5 text-sm font-semibold text-[#FFFFCA]">
            <a href="/admin" className="rounded-lg px-3 py-2 hover:bg-[#FFFFCA]/10">
              Beranda
            </a>
            <a href="/admin/menu" className="rounded-lg px-3 py-2 hover:bg-[#FFFFCA]/10">
              Menu
            </a>
            <a href="/admin/tables" className="rounded-lg px-3 py-2 hover:bg-[#FFFFCA]/10">
              Meja & QR
            </a>
            <a href="/cashier" className="rounded-lg px-3 py-2 hover:bg-[#FFFFCA]/10">
              Dashboard Kasir
            </a>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                activeTab === 'analytics' ? 'bg-[#FFFFCA] font-extrabold text-[#106F4D]' : 'hover:bg-[#FFFFCA]/10'
              }`}
            >
              Analitik
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                activeTab === 'promos' ? 'bg-[#FFFFCA] font-extrabold text-[#106F4D]' : 'hover:bg-[#FFFFCA]/10'
              }`}
            >
              Promo
            </button>
            <a href="/admin/sync" className="rounded-lg px-3 py-2 hover:bg-[#FFFFCA]/10">
              Sinkronisasi Olsera
            </a>
            <button
              onClick={() => setActiveTab('reco')}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                activeTab === 'reco' ? 'bg-[#FFFFCA] font-extrabold text-[#106F4D]' : 'hover:bg-[#FFFFCA]/10'
              }`}
            >
              Rekomendasi AI
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                activeTab === 'staff' ? 'bg-[#FFFFCA] font-extrabold text-[#106F4D]' : 'hover:bg-[#FFFFCA]/10'
              }`}
            >
              Staf
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 sm:p-8">
          {activeTab === 'analytics' && <AnalyticsMockView />}
          {activeTab === 'promos' && <PromosMockView />}
          {activeTab === 'reco' && <RecommendationsMockView />}
          {activeTab === 'staff' && <StaffMockView />}
          {activeTab === 'receipt' && <ReceiptMockView />}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANALYTICS MOCK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsMockView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#106F4D]">Analitik Penjualan</h1>
          <p className="text-xs font-semibold text-[#5B6B62]">Ringkasan performa dan pergerakan penjualan Matwona</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            defaultValue="2026-11-01"
            className="rounded-lg border border-[#D5DCCB] bg-white px-3 py-1.5 text-xs font-bold text-[#1F2A24]"
          />
          <span className="text-xs font-bold text-[#5B6B62]">—</span>
          <input
            type="date"
            defaultValue="2026-11-11"
            className="rounded-lg border border-[#D5DCCB] bg-white px-3 py-1.5 text-xs font-bold text-[#1F2A24]"
          />
          <button className="rounded-lg border border-[#106F4D] bg-white px-3 py-1.5 text-xs font-bold text-[#106F4D] hover:bg-[#E1F2EA]">
            Hari ini
          </button>
          <button className="rounded-lg border border-[#106F4D] bg-[#106F4D] px-3 py-1.5 text-xs font-bold text-white">
            7 Hari
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Total Pendapatan</span>
          <span className="text-2xl font-black text-[#1F2A24]">Rp4.870.000</span>
          <span className="text-xs font-bold text-[#069D70]">↑ 12,3% dari minggu lalu</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Jumlah Pesanan</span>
          <span className="text-2xl font-black text-[#1F2A24]">247</span>
          <span className="text-xs font-bold text-[#069D70]">↑ 8,1% pesanan selesai</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Rata-rata per Meja</span>
          <span className="text-2xl font-black text-[#1F2A24]">Rp19.717</span>
          <span className="text-xs font-bold text-[#069D70]">↑ 3,8% nilai keranjang</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Dibatalkan</span>
          <span className="text-2xl font-black text-[#1F2A24]">7</span>
          <span className="text-xs font-bold text-[#5B6B62]">2,8% rasio pembatalan</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tren Penjualan Harian */}
        <div className="rounded-2xl border border-[#E3E8D9] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-[#1F2A24]">Tren Harian (Pesanan)</h2>
          <div className="flex h-44 items-end gap-3 px-2">
            {[
              { day: 'Sen', val: 38, pct: 76, color: 'bg-[#106F4D]' },
              { day: 'Sel', val: 42, pct: 84, color: 'bg-[#106F4D]' },
              { day: 'Rab', val: 35, pct: 70, color: 'bg-[#106F4D]' },
              { day: 'Kam', val: 40, pct: 80, color: 'bg-[#106F4D]' },
              { day: 'Jum', val: 52, pct: 100, color: 'bg-[#069D70]' },
              { day: 'Sab', val: 48, pct: 92, color: 'bg-[#106F4D]' },
              { day: 'Min', val: 32, pct: 64, color: 'bg-[#106F4D]' },
            ].map((col) => (
              <div key={col.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#1F2A24]">{col.val}</span>
                <div className="w-full max-w-[36px] rounded-t-md bg-[#E3E8D9]/40 h-32 flex items-end">
                  <div
                    className={`w-full rounded-t-md ${col.color} transition-all duration-500`}
                    style={{ height: `${col.pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-[#5B6B62]">{col.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-[#5B6B62]">
            📌 <strong className="text-[#106F4D]">Jumat</strong> adalah hari paling ramai (+30% pesanan paket tuna).
          </p>
        </div>

        {/* Metode Pembayaran */}
        <div className="rounded-2xl border border-[#E3E8D9] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-[#1F2A24]">Metode Pembayaran</h2>
          <div className="flex items-center justify-center py-4">
            <div className="relative flex size-40 items-center justify-center rounded-full bg-[conic-gradient(#106F4D_0%_45%,#069D70_45%_72%,#7A4A00_72%_88%,#D5DCCB_88%_100%)] shadow-inner">
              <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-xl font-black text-[#1F2A24]">247</span>
                <span className="text-[10px] font-bold text-[#5B6B62]">transaksi</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#106F4D]" />
              <span>Kasir (Tunai): 45%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#069D70]" />
              <span>QRIS Dinamis: 27%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#7A4A00]" />
              <span>Impor Olsera: 16%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#D5DCCB]" />
              <span>Lainnya: 12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Menu Terlaris */}
      <div className="rounded-2xl border border-[#E3E8D9] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold text-[#1F2A24]">Menu Terlaris Periode Ini</h2>
        <div className="flex flex-col divide-y divide-[#E3E8D9]">
          {[
            { rank: 1, name: 'Tuna Sambal Matah (Reguler)', qty: 67, rev: 'Rp1.273.000', pct: 100, tag: 'Favorit' },
            { rank: 2, name: 'Tuna Sambal Matah (Jumbo)', qty: 54, rev: 'Rp1.566.000', pct: 81, tag: 'Paling Laris' },
            { rank: 3, name: 'Bakmie Tuna Sambal Matah', qty: 38, rev: 'Rp1.444.000', pct: 57, tag: 'Spesial' },
            { rank: 4, name: 'Es Teh Matwona', qty: 31, rev: 'Rp310.000', pct: 46, tag: 'Minuman' },
            { rank: 5, name: 'Nasi Telur Barendo', qty: 28, rev: 'Rp364.000', pct: 42, tag: 'Klasik' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-7 items-center justify-center rounded-lg text-xs font-black ${
                    item.rank === 1
                      ? 'bg-[#106F4D] text-white'
                      : item.rank === 2
                      ? 'bg-[#069D70] text-white'
                      : item.rank === 3
                      ? 'bg-[#FFF0D1] text-[#7A4A00]'
                      : 'bg-[#ECEEE8] text-[#46534B]'
                  }`}
                >
                  {item.rank}
                </span>
                <div>
                  <p className="font-bold text-[#1F2A24]">{item.name}</p>
                  <p className="text-xs text-[#5B6B62]">
                    {item.qty} porsi terjual · <strong className="text-[#106F4D]">{item.rev}</strong>
                  </p>
                </div>
              </div>
              <div className="w-32 hidden sm:block">
                <div className="h-2 w-full rounded-full bg-[#E3E8D9]">
                  <div className="h-full rounded-full bg-[#106F4D]" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROMOS MOCK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PromosMockView() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#106F4D]">Kelola Promo & Diskon</h1>
          <p className="text-xs font-semibold text-[#5B6B62]">Atur diskon otomatis berdasarkan hari, nominal, dan menu</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-[#106F4D] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0B5A3E]"
        >
          + Buat Promo Baru
        </button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Card 1 */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm transition-all hover:border-[#106F4D]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-extrabold text-[#106F4D]">
                Aktif
              </span>
              <span className="text-xs font-bold text-[#5B6B62]">Jumat</span>
            </div>
            <h3 className="text-base font-extrabold text-[#1F2A24]">Diskon 10% Paket Tuna</h3>
            <p className="text-xs text-[#5B6B62]">Berlaku setiap hari Jumat untuk semua olahan tuna (Reguler & Jumbo).</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-[#E1F2EA] px-2 py-0.5 text-[11px] font-bold text-[#106F4D]">
                Diskon 10%
              </span>
              <span className="rounded-md bg-[#ECEEE8] px-2 py-0.5 text-[11px] font-bold text-[#46534B]">
                Min. Rp0
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#E3E8D9] pt-3 text-xs text-[#5B6B62]">
            <span>1 Nov — 30 Nov 2026</span>
            <div className="flex gap-2">
              <button className="font-bold text-[#106F4D] hover:underline">Ubah</button>
              <button className="font-bold text-[#C0392B] hover:underline">Nonaktifkan</button>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm transition-all hover:border-[#106F4D]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-extrabold text-[#106F4D]">
                Aktif
              </span>
              <span className="text-xs font-bold text-[#5B6B62]">Sen — Jum</span>
            </div>
            <h3 className="text-base font-extrabold text-[#1F2A24]">Paket Hemat Makan Siang</h3>
            <p className="text-xs text-[#5B6B62]">Potongan Rp5.000 untuk total pesanan di atas Rp50.000.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-[#E1F2EA] px-2 py-0.5 text-[11px] font-bold text-[#106F4D]">
                -Rp5.000
              </span>
              <span className="rounded-md bg-[#ECEEE8] px-2 py-0.5 text-[11px] font-bold text-[#46534B]">
                Min. Rp50.000
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#E3E8D9] pt-3 text-xs text-[#5B6B62]">
            <span>1 Nov — 15 Des 2026</span>
            <div className="flex gap-2">
              <button className="font-bold text-[#106F4D] hover:underline">Ubah</button>
              <button className="font-bold text-[#C0392B] hover:underline">Nonaktifkan</button>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm transition-all hover:border-[#106F4D]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-extrabold text-[#106F4D]">
                Aktif
              </span>
              <span className="text-xs font-bold text-[#5B6B62]">Sabtu & Minggu</span>
            </div>
            <h3 className="text-base font-extrabold text-[#1F2A24]">Happy Weekend Bakmie</h3>
            <p className="text-xs text-[#5B6B62]">Diskon 15% setiap pembelian aneka Bakmie Series di akhir pekan.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-[#E1F2EA] px-2 py-0.5 text-[11px] font-bold text-[#106F4D]">
                Diskon 15%
              </span>
              <span className="rounded-md bg-[#ECEEE8] px-2 py-0.5 text-[11px] font-bold text-[#46534B]">
                Bakmie Series
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#E3E8D9] pt-3 text-xs text-[#5B6B62]">
            <span>1 Nov — 31 Des 2026</span>
            <div className="flex gap-2">
              <button className="font-bold text-[#106F4D] hover:underline">Ubah</button>
              <button className="font-bold text-[#C0392B] hover:underline">Nonaktifkan</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Sheet Preview */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E3E8D9] pb-3">
              <h3 className="text-lg font-extrabold text-[#106F4D]">Buat Promo Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-lg text-[#5B6B62] hover:text-[#1F2A24]">
                ✕
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1 font-bold">
                Judul Promo
                <input
                  type="text"
                  placeholder="mis. Promo Jumat Berkah"
                  className="rounded-lg border border-[#D5DCCB] p-2.5"
                />
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Deskripsi
                <textarea
                  placeholder="Keterangan singkat promo"
                  className="rounded-lg border border-[#D5DCCB] p-2.5"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 font-bold">
                  Tipe Diskon
                  <select className="rounded-lg border border-[#D5DCCB] p-2.5">
                    <option>Persen (%)</option>
                    <option>Nominal (Rp)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Nilai Diskon
                  <input type="number" placeholder="mis. 10" className="rounded-lg border border-[#D5DCCB] p-2.5" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[#E3E8D9] pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[#D5DCCB] px-4 py-2 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-[#106F4D] px-4 py-2 text-xs font-bold text-white"
              >
                Simpan Promo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RECOMMENDATIONS MOCK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationsMockView() {
  const [training, setTraining] = useState(false);

  const handleTrain = () => {
    setTraining(true);
    setTimeout(() => setTraining(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#106F4D]">Rekomendasi Menu AI (Reco)</h1>
          <p className="text-xs font-semibold text-[#5B6B62]">
            Association Rule Mining (FP-Growth) & Popularitas per Slot Waktu
          </p>
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="rounded-xl bg-[#106F4D] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0B5A3E] disabled:opacity-50"
        >
          {training ? 'Sedang Melatih Model…' : '🔄 Latih Ulang Model'}
        </button>
      </div>

      {/* Model Status Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Status Model</span>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-black text-[#106F4D]">Aktif</span>
            <span className="text-xs font-bold text-[#5B6B62]">v2026.11.05</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Data Latih</span>
          <span className="text-xl font-black text-[#1F2A24]">1.247 transaksi</span>
          <span className="text-xs text-[#5B6B62]">180 hari terakhir</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Rule Aktif</span>
          <span className="text-xl font-black text-[#1F2A24]">23 Aturan</span>
          <span className="text-xs text-[#5B6B62]">FP-Growth + Slot Waktu</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Hit Rate @3</span>
          <span className="text-xl font-black text-[#106F4D]">34,2%</span>
          <span className="text-xs font-bold text-[#069D70]">↑ vs baseline 12,1%</span>
        </div>
      </div>

      {/* Active Rules List */}
      <div className="rounded-2xl border border-[#E3E8D9] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold text-[#1F2A24]">Aturan "Sering Dibeli Bersama" Aktif</h2>
        <div className="flex flex-col gap-3">
          {[
            {
              from: ['Tuna Sambal Matah (Reguler)'],
              to: 'Es Teh Matwona',
              support: '8,2%',
              confidence: '67%',
              lift: '3,4',
            },
            {
              from: ['Bakmie Tuna Sambal Matah'],
              to: 'Risol Tuna Melt (3 pcs)',
              support: '5,1%',
              confidence: '54%',
              lift: '2,8',
            },
            {
              from: ['Tuna Sambal Matah (Jumbo)', 'Es Teh Matwona'],
              to: 'Soft Cookies Chocochip',
              support: '3,7%',
              confidence: '42%',
              lift: '2,1',
            },
            {
              from: ['Nasi Telur Barendo'],
              to: 'Jus Alpukat',
              support: '2,8%',
              confidence: '35%',
              lift: '1,9',
            },
          ].map((r, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E3E8D9] p-4 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                {r.from.map((f) => (
                  <span key={f} className="rounded-md bg-[#E1F2EA] px-2.5 py-1 font-bold text-[#106F4D]">
                    {f}
                  </span>
                ))}
                <span className="font-extrabold text-[#069D70]">➔</span>
                <span className="rounded-md bg-[#069D70] px-2.5 py-1 font-extrabold text-white">{r.to}</span>
              </div>
              <div className="flex items-center gap-4 text-[#5B6B62]">
                <span>
                  Support: <strong className="text-[#1F2A24]">{r.support}</strong>
                </span>
                <span>
                  Confidence: <strong className="text-[#1F2A24]">{r.confidence}</strong>
                </span>
                <span>
                  Lift: <strong className="text-[#106F4D]">{r.lift}</strong>
                </span>
                <input type="checkbox" defaultChecked className="size-4 accent-[#106F4D]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STAFF MOCK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function StaffMockView() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#106F4D]">Kelola Staf & Kasir</h1>
          <p className="text-xs font-semibold text-[#5B6B62]">Manajemen akses akun kasir dan administrator outlet</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-[#106F4D] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0B5A3E]"
        >
          + Tambah Staf Baru
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Total Staf</span>
          <p className="text-2xl font-black text-[#1F2A24]">5 Akun</p>
        </div>
        <div className="rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Admin</span>
          <p className="text-2xl font-black text-[#106F4D]">2 Akun</p>
        </div>
        <div className="rounded-2xl border border-[#E3E8D9] bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-[#5B6B62]">Kasir</span>
          <p className="text-2xl font-black text-[#069D70]">3 Akun</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E3E8D9] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E3E8D9] bg-[#ECEEE8]/50 text-xs text-[#5B6B62]">
            <tr>
              <th className="p-4">Nama</th>
              <th className="p-4">Email</th>
              <th className="p-4">Peran</th>
              <th className="p-4">Status</th>
              <th className="p-4">Login Terakhir</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E8D9]">
            {[
              { name: 'Owner Matwona', email: 'owner@matwona.local', role: 'ADMIN', status: 'Aktif', last: '11 Nov 09:15' },
              { name: 'Admin Kantor', email: 'admin@matwona.local', role: 'ADMIN', status: 'Aktif', last: '10 Nov 18:42' },
              { name: 'Kasir Siang', email: 'kasir.siang@matwona.local', role: 'CASHIER', status: 'Aktif', last: '11 Nov 10:01' },
              { name: 'Kasir Malam', email: 'kasir.malam@matwona.local', role: 'CASHIER', status: 'Aktif', last: '10 Nov 20:30' },
              { name: 'Kasir Cadangan', email: 'kasir.lama@matwona.local', role: 'CASHIER', status: 'Nonaktif', last: '15 Okt 09:22' },
            ].map((u) => (
              <tr key={u.email} className="hover:bg-[#E1F2EA]/20">
                <td className="p-4 font-bold text-[#1F2A24]">{u.name}</td>
                <td className="p-4 text-xs text-[#5B6B62]">{u.email}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      u.role === 'ADMIN' ? 'bg-[#106F4D] text-white' : 'bg-[#E2EEF9] text-[#1D4F7A]'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      u.status === 'Aktif' ? 'bg-[#DDF3E9] text-[#106F4D]' : 'bg-[#FBE3E0] text-[#C0392B]'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-[#5B6B62]">{u.last}</td>
                <td className="p-4 text-right text-xs">
                  <button className="font-bold text-[#106F4D] hover:underline">Ubah</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="border-b border-[#E3E8D9] pb-3 text-lg font-extrabold text-[#106F4D]">
              Tambah Staf Baru
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1 font-bold">
                Nama Staf
                <input type="text" placeholder="mis. Kasir Sore" className="rounded-lg border border-[#D5DCCB] p-2.5" />
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Email
                <input
                  type="email"
                  placeholder="kasir@matwona.local"
                  className="rounded-lg border border-[#D5DCCB] p-2.5"
                />
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Peran
                <select className="rounded-lg border border-[#D5DCCB] p-2.5">
                  <option value="CASHIER">Kasir (Dashboard Kasir Saja)</option>
                  <option value="ADMIN">Admin (Akses Penuh)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Kata Sandi
                <input
                  type="password"
                  placeholder="Min. 8 karakter"
                  className="rounded-lg border border-[#D5DCCB] p-2.5"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[#E3E8D9] pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-[#D5DCCB] px-4 py-2 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg bg-[#106F4D] px-4 py-2 text-xs font-bold text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RECEIPT MOCK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptMockView() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <span className="rounded-full bg-[#DDF3E9] px-3 py-1 text-xs font-black text-[#106F4D]">
          Terintegrasi di Dashboard Kasir ✓
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-[#106F4D]">Preview Struk Kasir Thermal (58mm / 80mm)</h1>
        <p className="text-xs text-[#5B6B62]">
          Format struk standar yang dicetak oleh kasir langsung ke printer thermal USB atau Bluetooth.
        </p>
      </div>

      <div className="w-[300px] rounded-xl border border-[#D5DCCB] bg-white p-5 font-mono text-xs text-black shadow-xl">
        <div className="text-center font-bold">
          <div className="text-base font-black tracking-wider">MATWONA</div>
          <div className="text-[10px] text-gray-600">Two worlds. One table. Simply, makan.</div>
          <div className="text-[10px] text-gray-500">Jl. Matwona, Bandung</div>
          <div className="my-2 border-b border-dashed border-gray-400" />
        </div>

        <div className="flex flex-col gap-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>No Order:</span>
            <span className="font-bold">MTW-261111-0042</span>
          </div>
          <div className="flex justify-between">
            <span>Meja:</span>
            <span className="font-bold">Meja 5</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>10:22 WIB</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span className="font-bold">Rina</span>
          </div>
        </div>

        <div className="my-2 border-b border-dashed border-gray-400" />

        <div className="flex flex-col gap-1.5 py-1 text-[11px]">
          <div>
            <div className="flex justify-between">
              <span className="font-semibold">2x Tuna Sambal Matah (R)</span>
              <span className="font-bold">Rp38.000</span>
            </div>
            <span className="text-[10px] italic text-gray-500">Note: sambal dipisah</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">1x Es Teh Matwona</span>
            <span className="font-bold">Rp10.000</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">1x Soft Cookies</span>
            <span className="font-bold">Rp10.000</span>
          </div>
        </div>

        <div className="my-2 border-b border-dashed border-gray-400" />

        <div className="flex flex-col gap-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>Rp58.000</span>
          </div>
          <div className="flex justify-between text-[#106F4D]">
            <span>Diskon (Jumat):</span>
            <span>-Rp5.000</span>
          </div>
          <div className="flex justify-between pt-1 text-xs font-black">
            <span>TOTAL:</span>
            <span>Rp53.000</span>
          </div>
          <div className="flex justify-between pt-0.5 text-[10px] text-gray-600">
            <span>Metode:</span>
            <span className="font-bold">BAYAR DI KASIR</span>
          </div>
        </div>

        <div className="my-2.5 border-b border-dashed border-gray-400" />

        <div className="text-center text-[10px] text-gray-600">
          <div>Terima kasih atas kunjungan Anda</div>
          <div className="font-semibold">Selamat Menikmati!</div>
        </div>
      </div>
    </div>
  );
}
