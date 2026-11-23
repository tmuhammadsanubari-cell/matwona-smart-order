'use client';

import { useId, useState, type ReactNode } from 'react';
import {
  formatRupiah,
  POS_PRODUCT_FIELDS,
  POS_PRODUCT_FIELD_LABEL,
  POS_REQUIRED_PRODUCT_FIELDS,
  posColumnMappingSchema,
  type PosProductField,
  type PosSyncDiffRow,
  type PosSyncPreviewDto,
  type PosSyncStatus,
} from 'shared';
import { Badge, Button, Card, cx, EmptyState, Input, ProgressSteps, type BadgeTone, type ProgressStepState } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { todayWib } from '@/lib/cashier-board';
import { buildMappingRows, mergeMapping, readCsvHeaders, validateMappingRows, type MappingRow } from '@/lib/pos-sync-mapping';
import { downloadStaffFile } from '@/lib/staff-download';
import { usePosSyncMutations, useProductMapping, useRefreshSyncHistory, useSyncHistory } from './use-pos-sync';

export type SyncTab = 'import' | 'export' | 'history';

const TABS: Array<{ id: SyncTab; label: string }> = [
  { id: 'import', label: 'Impor Produk' },
  { id: 'export', label: 'Ekspor Transaksi' },
  { id: 'history', label: 'Riwayat Sinkron' },
];

/** Kolom CSV ekspor transaksi (OlseraCsvAdapter.pushTransactions). */
const EXPORT_COLUMNS = ['kode_pesanan', 'tanggal', 'meja', 'item', 'qty', 'harga', 'diskon', 'total', 'metode_bayar'];

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiClientError ? error.message : fallback);

const REQUIRED = new Set<PosProductField>(POS_REQUIRED_PRODUCT_FIELDS);

/** Sinkronisasi Olsera via CSV (FR-013, FR-014, S2-10): impor produk + pemetaan kolom, ekspor transaksi, riwayat. */
export function OlseraSyncView() {
  const [tab, setTab] = useState<SyncTab>('import');
  const baseId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">Sinkronisasi Olsera</h1>
          <Badge tone="success">Mode: Impor CSV</Badge>
        </div>
        <p className="text-xs font-semibold text-muted">Integrasi API Olsera menyusul saat akses kredensial tersedia.</p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div role="tablist" aria-label="Menu sinkronisasi" className="flex overflow-x-auto border-b border-line bg-surface px-2 sm:px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`${baseId}-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cx(
                'min-h-11 shrink-0 border-b-2 px-4 text-sm whitespace-nowrap transition',
                tab === t.id ? 'border-primary font-extrabold text-primary' : 'border-transparent font-bold text-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`} className="p-4 sm:p-6">
          {tab === 'import' && <ImportPanel />}
          {tab === 'export' && <ExportPanel />}
          {tab === 'history' && <HistoryPanel />}
        </div>
      </Card>
    </div>
  );
}

function SectionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xs font-extrabold tracking-wider text-primary uppercase">
      {children}
    </h2>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-control bg-primary-soft p-3 text-sm font-semibold text-primary-hover">
      {children}
    </p>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-control bg-danger-soft p-3 text-sm font-semibold text-danger-strong">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impor produk
// ---------------------------------------------------------------------------

function ImportPanel() {
  const savedMapping = useProductMapping();
  const { saveMapping, preview, apply } = usePosSyncMutations();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [saveForNext, setSaveForNext] = useState(true);
  const [result, setResult] = useState<PosSyncPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const problems = validateMappingRows(rows);
  const busy = saveMapping.isPending || preview.isPending;

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setError(null);
    setInputKey((k) => k + 1);
  };

  const handleFile = async (picked: File) => {
    setResult(null);
    setError(null);
    setNotice(null);
    const headers = readCsvHeaders(await picked.text());
    if (headers.length === 0) {
      setFile(null);
      setRows([]);
      setError('File CSV kosong atau tidak punya baris judul kolom.');
      return;
    }
    setFile(picked);
    setRows(buildMappingRows(headers, savedMapping.data ?? {}));
  };

  const changeField = (header: string, field: PosProductField | '') => {
    setRows((prev) => prev.map((row) => (row.header === header ? { ...row, field } : row)));
    // Pratinjau lama tidak berlaku lagi bila pemetaan diubah.
    setResult(null);
  };

  const handlePreview = async () => {
    if (!file || problems.length > 0) return;
    setError(null);
    const parsed = posColumnMappingSchema.safeParse(mergeMapping(savedMapping.data ?? {}, rows));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pemetaan kolom tidak valid.');
      return;
    }
    try {
      if (saveForNext) await saveMapping.mutateAsync(parsed.data);
      setResult(await preview.mutateAsync({ file, mapping: parsed.data }));
    } catch (err) {
      setError(errorMessage(err, 'Pratinjau gagal dimuat. Coba lagi.'));
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setError(null);
    try {
      const { applied } = await apply.mutateAsync(result.logId);
      reset();
      setNotice(`${applied} produk diterapkan ke menu Matwona.`);
    } catch (err) {
      setError(errorMessage(err, 'Gagal menerapkan impor. Coba lagi.'));
    }
  };

  const stepState = (step: 1 | 2 | 3): ProgressStepState => {
    const current = result ? 3 : file ? 2 : 1;
    return step < current ? 'done' : step === current ? 'current' : 'todo';
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressSteps
        aria-label="Langkah impor produk"
        steps={[
          { label: 'Unggah file', state: stepState(1) },
          { label: 'Pemetaan kolom', state: stepState(2) },
          { label: 'Pratinjau & terapkan', state: stepState(3) },
        ]}
      />

      <section className="flex flex-col gap-3" aria-labelledby="sync-step-upload">
        <SectionLabel id="sync-step-upload">1 · Unggah File</SectionLabel>
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-primary-soft p-5 text-center transition focus-within:border-primary hover:border-primary">
          <input
            key={inputKey}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={savedMapping.isPending}
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) void handleFile(picked);
            }}
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary" aria-hidden="true">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 18v-6M9 15l3-3 3 3" />
          </svg>
          <span className="text-sm font-extrabold text-primary">Pilih file export produk Olsera (.csv)</span>
          <span className="text-xs text-muted">Baris pertama harus berisi judul kolom</span>
        </label>
        {file && (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface p-3 text-sm">
            <span className="font-bold break-all text-ink">{file.name}</span>
            <span className="text-xs text-muted">
              {rows.length} kolom · {(file.size / 1024).toFixed(1)} KB
            </span>
          </p>
        )}
        {savedMapping.isError && <Alert>Pemetaan tersimpan gagal dimuat. Kolom perlu dipilih manual.</Alert>}
      </section>

      {rows.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-line pt-6" aria-labelledby="sync-step-mapping">
          <SectionLabel id="sync-step-mapping">2 · Pemetaan Kolom</SectionLabel>
          <p className="text-sm text-muted">
            Pilih field Matwona untuk setiap kolom di file. Kolom yang tidak dipakai pilih &ldquo;Abaikan&rdquo;.
          </p>
          <ul className="divide-y divide-line rounded-control border border-line">
            {rows.map((row) => (
              <li key={row.header} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="min-w-0 font-mono text-sm break-all text-ink">{row.header}</span>
                <select
                  aria-label={`Field untuk kolom ${row.header}`}
                  value={row.field}
                  onChange={(e) => changeField(row.header, e.target.value as PosProductField | '')}
                  className="min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none sm:w-56"
                >
                  <option value="">Abaikan kolom ini</option>
                  {POS_PRODUCT_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {POS_PRODUCT_FIELD_LABEL[field]}
                      {REQUIRED.has(field) ? ' (wajib)' : ''}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          {problems.length > 0 && (
            <ul aria-label="Masalah pemetaan" className="flex flex-col gap-1 rounded-control bg-warning-soft p-3 text-sm font-semibold text-warning">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={saveForNext} onChange={(e) => setSaveForNext(e.target.checked)} className="size-5 accent-primary" />
            <span>Simpan pemetaan ini untuk impor berikutnya</span>
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={reset} disabled={busy || apply.isPending}>
              Ganti file
            </Button>
            <Button onClick={() => void handlePreview()} disabled={problems.length > 0} loading={busy}>
              Lihat Pratinjau
            </Button>
          </div>
        </section>
      )}

      {error && <Alert>{error}</Alert>}
      {notice && <Notice>{notice}</Notice>}

      {result && <PreviewSection result={result} applying={apply.isPending} onApply={() => void handleApply()} onCancel={reset} />}
    </div>
  );
}

const DIFF_LABEL: Record<PosSyncDiffRow['status'], { label: string; tone: BadgeTone }> = {
  new: { label: 'Baru', tone: 'success' },
  changed: { label: 'Berubah', tone: 'warning' },
  unchanged: { label: 'Tetap', tone: 'neutral' },
};

function StatTile({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cx('flex flex-col rounded-card p-4', className)}>
      <dt className="text-xs font-bold">{label}</dt>
      <dd className="text-3xl font-black">{value}</dd>
    </div>
  );
}

function PreviewSection({
  result,
  applying,
  onApply,
  onCancel,
}: {
  result: PosSyncPreviewDto;
  applying: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { summary } = result;
  const importable = summary.newCount + summary.changedCount + summary.unchangedCount;

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6" aria-labelledby="sync-step-preview">
      <SectionLabel id="sync-step-preview">3 · Pratinjau Perubahan</SectionLabel>

      <dl aria-label="Ringkasan pratinjau" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Produk baru" value={summary.newCount} className="bg-success-soft text-primary-hover" />
        <StatTile label="Berubah" value={summary.changedCount} className="bg-warning-soft text-warning" />
        <StatTile label="Tidak berubah" value={summary.unchangedCount} className="bg-neutral-soft text-neutral" />
        <StatTile label="Baris error" value={summary.errorCount} className="bg-danger-soft text-danger-strong" />
      </dl>

      {result.errors.length > 0 && (
        <div className="flex flex-col gap-2 rounded-control bg-danger-soft p-4 text-sm text-danger-strong">
          <p className="font-extrabold">{result.errors.length} baris dilewati</p>
          <ul aria-label="Baris error" className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {result.errors.map((err) => (
              <li key={`${err.row}-${err.reason}`}>
                <span className="font-mono font-bold">Baris {err.row}:</span> {err.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.diff.length > 0 && (
        <div className="max-h-96 overflow-auto rounded-control border border-line">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="sticky top-0 bg-cream text-xs font-bold text-muted">
              <tr>
                <th className="p-3">Produk</th>
                <th className="p-3">Status</th>
                <th className="p-3">Harga lama</th>
                <th className="p-3">Harga baru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.diff.map((row) => (
                <tr key={`${row.sku ?? ''}-${row.name}`}>
                  <td className="p-3">
                    <span className="block font-bold text-ink">{row.name}</span>
                    {row.categoryName && <span className="text-xs text-muted">{row.categoryName}</span>}
                  </td>
                  <td className="p-3">
                    <Badge tone={DIFF_LABEL[row.status].tone}>{DIFF_LABEL[row.status].label}</Badge>
                  </td>
                  <td className="p-3 text-muted">{row.oldPrice !== undefined && row.oldPrice !== row.newPrice ? formatRupiah(row.oldPrice) : '—'}</td>
                  <td className="p-3 font-extrabold text-primary">{formatRupiah(row.newPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importable === 0 && <Alert>Tidak ada baris yang bisa diimpor. Periksa pemetaan kolom atau isi file.</Alert>}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={applying}>
          Batal
        </Button>
        <Button onClick={onApply} disabled={importable === 0} loading={applying}>
          Terapkan ke Menu
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Ekspor transaksi
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function ExportPanel() {
  const [from, setFrom] = useState(() => todayWib(new Date(Date.now() - 29 * DAY_MS)));
  const [to, setTo] = useState(() => todayWib());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refreshHistory = useRefreshSyncHistory();

  const rangeError = from && to && from > to ? 'Tanggal awal tidak boleh setelah tanggal akhir.' : undefined;

  const handleExport = async () => {
    if (!from || !to || rangeError) return;
    setError(null);
    setNotice(null);
    setDownloading(true);
    try {
      // Rentang tanggal WIB penuh (00.00–23.59).
      const query = new URLSearchParams({ from: `${from}T00:00:00+07:00`, to: `${to}T23:59:59.999+07:00` });
      const fileName = await downloadStaffFile(`/pos-sync/export-transactions?${query.toString()}`, {
        fallbackName: `matwona_transaksi_${from}_${to}.csv`,
        errorMessage: 'Gagal mengunduh CSV transaksi. Coba lagi.',
      });
      setNotice(`${fileName} diunduh.`);
      refreshHistory();
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengunduh CSV transaksi. Coba lagi.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
        <Input label="Dari tanggal" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Sampai tanggal" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} error={rangeError} />
      </div>
      <div>
        <Badge tone="info">Hanya pesanan lunas (PAID)</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-muted">Kolom di file CSV</span>
        <ul className="flex flex-wrap gap-2">
          {EXPORT_COLUMNS.map((col) => (
            <li key={col} className="rounded-full bg-neutral-soft px-3 py-1 font-mono text-xs font-semibold text-neutral">
              {col}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted">File CSV ini dipakai untuk impor atau rekonsiliasi transaksi di backoffice Olsera.</p>

      {error && <Alert>{error}</Alert>}
      {notice && <Notice>{notice}</Notice>}

      <div>
        <Button onClick={() => void handleExport()} disabled={!from || !to || Boolean(rangeError)} loading={downloading}>
          Unduh CSV Transaksi
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Riwayat sinkronisasi
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<PosSyncStatus, { label: string; tone: BadgeTone }> = {
  PREVIEW: { label: 'Pratinjau', tone: 'neutral' },
  SUCCESS: { label: 'Sukses', tone: 'success' },
  PARTIAL: { label: 'Sebagian', tone: 'warning' },
  FAILED: { label: 'Gagal', tone: 'danger' },
};

const wibDateTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatSyncTime = (iso: string) => `${wibDateTime.format(new Date(iso))} WIB`;

function HistoryPanel() {
  const history = useSyncHistory();

  if (history.isPending) return <p className="py-6 text-center text-sm text-muted">Memuat riwayat…</p>;
  if (history.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>{errorMessage(history.error, 'Riwayat sinkronisasi gagal dimuat.')}</Alert>
        <Button variant="secondary" onClick={() => void history.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }
  if (history.data.length === 0) {
    return <EmptyState title="Belum ada riwayat sinkronisasi" description="Impor produk atau ekspor transaksi akan tercatat di sini." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-cream text-xs font-bold text-muted">
          <tr>
            <th className="p-3">Waktu</th>
            <th className="p-3">Arah</th>
            <th className="p-3">Jenis</th>
            <th className="p-3">Status</th>
            <th className="p-3">Sukses / Gagal</th>
            <th className="p-3">Nama file</th>
            <th className="p-3">Oleh</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {history.data.map((log) => {
            const status = STATUS_LABEL[log.status] ?? { label: log.status, tone: 'neutral' as const };
            return (
              <tr key={log.id}>
                <td className="p-3 font-semibold whitespace-nowrap text-ink">{formatSyncTime(log.createdAt)}</td>
                <td className="p-3 font-bold">{log.direction}</td>
                <td className="p-3">{log.entity}</td>
                <td className="p-3">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="p-3 font-bold text-ink">
                  {log.successCount} / {log.failedCount}
                </td>
                <td className="p-3 font-mono break-all text-muted">{log.fileName ?? '—'}</td>
                <td className="p-3 text-ink">{log.userName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
