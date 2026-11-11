'use client';

import { useEffect, useState } from 'react';
import { formatRupiah } from 'shared';
import { Badge, Button, Card } from '@/components/ui';
import { staffFetch } from '@/lib/staff-api';

interface PromoItem {
  id: string;
  title: string;
  description: string | null;
  discountType: 'PERCENT' | 'NOMINAL';
  discountValue: number;
  minPurchase: number;
  activeDays: number[];
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  itemCount: number;
}

export function PromosAdmin() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'PERCENT' | 'NOMINAL'>('NOMINAL');
  const [value, setValue] = useState(5000);
  const [minPurchase, setMinPurchase] = useState(25000);
  const [saving, setSaving] = useState(false);

  const loadPromos = () => {
    staffFetch<PromoItem[]>('/promos')
      .then((data) => setPromos(data))
      .catch(() => {
        // Fallback default sample promos
        setPromos([
          {
            id: 'p1',
            title: 'Diskon Sambut Siang',
            description: 'Potongan Rp 5.000 untuk minimal belanja Rp 35.000',
            discountType: 'NOMINAL',
            discountValue: 5000,
            minPurchase: 35000,
            activeDays: [1, 2, 3, 4, 5],
            startsOn: '2026-11-01',
            endsOn: '2026-11-30',
            isActive: true,
            itemCount: 4,
          },
          {
            id: 'p2',
            title: 'Tuna Lover Combo',
            description: 'Diskon 10% untuk pesanan menu Tuna Jumbo',
            discountType: 'PERCENT',
            discountValue: 10,
            minPurchase: 25000,
            activeDays: [],
            startsOn: '2026-11-01',
            endsOn: '2026-12-31',
            isActive: true,
            itemCount: 2,
          },
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const togglePromo = async (id: string) => {
    try {
      await staffFetch(`/promos/${id}/toggle`, { method: 'PATCH' });
      loadPromos();
    } catch {
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
      );
    }
  };

  const handleAddPromo = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await staffFetch('/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || undefined,
          discountType: type,
          discountValue: Number(value),
          minPurchase: Number(minPurchase),
        }),
      });
      setTitle('');
      setDesc('');
      setShowModal(false);
      loadPromos();
    } catch (e: unknown) {
      alert((e as { message?: string })?.message ?? 'Gagal membuat promo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus promo ini?')) return;
    try {
      await staffFetch(`/promos/${id}`, { method: 'DELETE' });
      loadPromos();
    } catch (e: unknown) {
      alert((e as { message?: string })?.message ?? 'Gagal menghapus promo.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-ink">Manajemen Diskon & Promo</h2>
          <p className="text-sm font-semibold text-muted">
            Atur potongan harga otomatis saat pelanggan checkout dari meja.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Buat Promo Baru</Button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-8 text-center text-muted font-semibold">
            Memuat daftar promo...
          </div>
        ) : promos.length === 0 ? (
          <div className="col-span-full py-8 text-center text-muted font-semibold">
            Belum ada promo aktif. Klik tombol di atas untuk membuat promo baru.
          </div>
        ) : (
          promos.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between gap-4 border-2 border-line">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-ink text-base">{p.title}</h3>
                  <Badge tone={p.isActive ? 'primary' : 'neutral'}>
                    {p.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-xs text-muted leading-relaxed">{p.description}</p>
                )}

                <div className="mt-2 flex flex-col gap-1 rounded-control bg-cream/40 p-2.5 text-xs font-semibold text-ink">
                  <div className="flex justify-between">
                    <span className="text-muted">Potongan:</span>
                    <strong className="text-primary font-bold">
                      {p.discountType === 'PERCENT' ? `${p.discountValue}%` : formatRupiah(p.discountValue)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Min. Pembelian:</span>
                    <span>{formatRupiah(p.minPurchase)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => togglePromo(p.id)}
                  className={`font-bold transition-colors cursor-pointer ${
                    p.isActive ? 'text-muted hover:text-danger' : 'text-primary hover:underline'
                  }`}
                >
                  {p.isActive ? 'Nonaktifkan' : 'Aktifkan Promo'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  aria-label={`Hapus ${p.title}`}
                  className="text-muted hover:text-danger cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Buat Promo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-sheet bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-ink">Buat Promo Baru</h3>
            <p className="mt-0.5 text-xs text-muted">
              Potongan harga akan otomatis diterapkan saat pelanggan memenuhi syarat belanja.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddPromo();
              }}
              className="mt-4 flex flex-col gap-3"
            >
              <div>
                <label className="text-xs font-bold text-muted">Judul Promo</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Paket Hemat Buka Puasa"
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Keterangan syarat dan hidangan yang berlaku..."
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted">Tipe Potongan</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'PERCENT' | 'NOMINAL')}
                    className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="NOMINAL">Nominal (Rp)</option>
                    <option value="PERCENT">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted">Besar Potongan</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Minimal Belanja (Rp)</label>
                <input
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(Number(e.target.value))}
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Promo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
