'use client';

import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';

interface PromoItem {
  id: string;
  title: string;
  description: string;
  discountType: 'PERCENT' | 'NOMINAL';
  discountValue: number;
  minPurchase: number;
  activeDays: string;
  period: string;
  isActive: boolean;
}

const INITIAL_PROMOS: PromoItem[] = [
  {
    id: 'p1',
    title: 'Diskon 10% Paket Tuna',
    description: 'Berlaku setiap hari Jumat untuk semua menu olahan tuna (Reguler & Jumbo).',
    discountType: 'PERCENT',
    discountValue: 10,
    minPurchase: 0,
    activeDays: 'Jumat',
    period: '1 Nov — 30 Nov 2026',
    isActive: true,
  },
  {
    id: 'p2',
    title: 'Paket Hemat Makan Siang',
    description: 'Potongan Rp5.000 untuk total belanja minimal Rp50.000.',
    discountType: 'NOMINAL',
    discountValue: 5000,
    minPurchase: 50000,
    activeDays: 'Senin — Jumat',
    period: '1 Nov — 15 Des 2026',
    isActive: true,
  },
  {
    id: 'p3',
    title: 'Happy Weekend Bakmie',
    description: 'Diskon 15% setiap pembelian aneka varian Bakmie Series di akhir pekan.',
    discountType: 'PERCENT',
    discountValue: 15,
    minPurchase: 0,
    activeDays: 'Sabtu & Minggu',
    period: '1 Nov — 31 Des 2026',
    isActive: true,
  },
];

export function PromosAdmin() {
  const [promos, setPromos] = useState<PromoItem[]>(INITIAL_PROMOS);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'NOMINAL'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(10);

  const togglePromo = (id: string) => {
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
    );
  };

  const handleCreatePromo = () => {
    if (!title.trim()) return;
    const newPromo: PromoItem = {
      id: `p-${Date.now()}`,
      title,
      description,
      discountType,
      discountValue: Number(discountValue),
      minPurchase: 0,
      activeDays: 'Setiap Hari',
      period: '11 Nov — 31 Des 2026',
      isActive: true,
    };
    setPromos([newPromo, ...promos]);
    setTitle('');
    setDescription('');
    setShowModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">
          Kelola penawaran promo dan diskon otomatis untuk pelanggan di meja.
        </p>
        <Button onClick={() => setShowModal(true)}>+ Buat Promo Baru</Button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {promos.map((promo) => (
          <Card
            key={promo.id}
            className={`flex flex-col justify-between gap-4 transition-all ${
              promo.isActive ? 'hover:border-primary' : 'opacity-70 grayscale'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Badge tone={promo.isActive ? 'success' : 'neutral'}>
                  {promo.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <span className="text-xs font-bold text-muted">{promo.activeDays}</span>
              </div>
              <h3 className="text-base font-extrabold text-ink">{promo.title}</h3>
              <p className="text-xs text-muted">{promo.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="primary">
                  {promo.discountType === 'PERCENT'
                    ? `Diskon ${promo.discountValue}%`
                    : `Diskon Rp${promo.discountValue.toLocaleString('id-ID')}`}
                </Badge>
                {promo.minPurchase > 0 && (
                  <Badge tone="neutral">Min. Rp{promo.minPurchase.toLocaleString('id-ID')}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
              <span>{promo.period}</span>
              <button
                type="button"
                onClick={() => togglePromo(promo.id)}
                className={`font-bold transition-colors ${
                  promo.isActive ? 'text-danger hover:underline' : 'text-primary hover:underline'
                }`}
              >
                {promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Buat Promo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-card bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-extrabold text-primary">Buat Promo Baru</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-lg text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3.5 text-xs">
              <label className="flex flex-col gap-1 font-bold text-ink">
                Judul Promo
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="mis. Promo Jumat Berkah"
                  className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 font-bold text-ink">
                Deskripsi
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat mengenai ketentuan promo"
                  rows={2}
                  className="rounded-control border border-line-strong bg-surface p-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 font-bold text-ink">
                  Tipe Diskon
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'NOMINAL')}
                    className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="PERCENT">Persen (%)</option>
                    <option value="NOMINAL">Nominal (Rp)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold text-ink">
                  Nilai Diskon
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder="mis. 10 atau 5000"
                    className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button onClick={handleCreatePromo}>Simpan Promo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
