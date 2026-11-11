'use client';

import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';

interface RecoRule {
  id: string;
  from: string[];
  to: string;
  support: string;
  confidence: string;
  lift: string;
  active: boolean;
}

const INITIAL_RULES: RecoRule[] = [
  {
    id: 'r1',
    from: ['Tuna Sambal Matah (Reguler)'],
    to: 'Es Teh Matwona',
    support: '8,2%',
    confidence: '67%',
    lift: '3,4',
    active: true,
  },
  {
    id: 'r2',
    from: ['Bakmie Tuna Sambal Matah'],
    to: 'Risol Tuna Melt (3 pcs)',
    support: '5,1%',
    confidence: '54%',
    lift: '2,8',
    active: true,
  },
  {
    id: 'r3',
    from: ['Tuna Sambal Matah (Jumbo)', 'Es Teh Matwona'],
    to: 'Soft Cookies Chocochip',
    support: '3,7%',
    confidence: '42%',
    lift: '2,1',
    active: true,
  },
  {
    id: 'r4',
    from: ['Nasi Telur Barendo'],
    to: 'Jus Alpukat',
    support: '2,8%',
    confidence: '35%',
    lift: '1,9',
    active: true,
  },
];

export function RecommendationsAdmin() {
  const [rules, setRules] = useState<RecoRule[]>(INITIAL_RULES);
  const [training, setTraining] = useState(false);
  const [trainedNotice, setTrainedNotice] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainedNotice(false);
    // Simulate training / trigger endpoint
    setTimeout(() => {
      setTraining(false);
      setTrainedNotice(true);
      setTimeout(() => setTrainedNotice(false), 4000);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">
            Association Rule Mining (FP-Growth) & Popularitas per Slot Waktu untuk rekomendasi keranjang.
          </p>
          {trainedNotice && (
            <p className="mt-1 text-xs font-bold text-success">
              ✓ Model berhasil dilatih ulang dan aturan rekomendasi telah diperbarui!
            </p>
          )}
        </div>
        <Button onClick={handleTrain} loading={training}>
          🔄 Latih Ulang Model
        </Button>
      </div>

      {/* Model Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Status Model</span>
          <div className="flex items-center gap-2">
            <Badge tone="success">Aktif</Badge>
            <span className="text-xs font-bold text-muted">v2026.11.05</span>
          </div>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Data Latih</span>
          <span className="text-xl font-black text-ink">1.247 transaksi</span>
          <span className="text-xs text-muted">180 hari terakhir</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Aturan Aktif</span>
          <span className="text-xl font-black text-ink">{rules.filter((r) => r.active).length} Aturan</span>
          <span className="text-xs text-muted">FP-Growth + Slot Waktu</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Hit Rate @3</span>
          <span className="text-xl font-black text-primary">34,2%</span>
          <span className="text-xs font-bold text-success">↑ vs baseline 12,1%</span>
        </Card>
      </div>

      {/* Active Rules List */}
      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-extrabold text-ink">Aturan "Sering Dibeli Bersama" yang Aktif</h2>
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-control border border-line p-4 transition-all ${
                rule.active ? 'bg-surface' : 'bg-line/30 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {rule.from.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary"
                  >
                    {f}
                  </span>
                ))}
                <span className="font-extrabold text-accent">➔</span>
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-extrabold text-primary-foreground">
                  {rule.to}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>
                  Support: <strong className="text-ink">{rule.support}</strong>
                </span>
                <span>
                  Confidence: <strong className="text-ink">{rule.confidence}</strong>
                </span>
                <span>
                  Lift: <strong className="text-primary">{rule.lift}</strong>
                </span>
                <label className="flex cursor-pointer items-center gap-1.5 font-bold text-ink">
                  <input
                    type="checkbox"
                    checked={rule.active}
                    onChange={() => toggleRule(rule.id)}
                    className="size-4 accent-primary"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
