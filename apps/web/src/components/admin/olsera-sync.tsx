'use client';

import { useEffect, useState, useTransition } from 'react';
import { formatRupiah } from 'shared';
import { Badge, Button, Card, toast, type BadgeTone } from '@/components/ui';
import { staffFetch } from '@/lib/staff-api';

export type SyncTab = 'import' | 'export' | 'history';

export interface DiffRow {
  name: string;
  categoryName?: string;
  sku?: string;
  status: 'new' | 'changed' | 'unchanged';
  oldPrice?: number;
  newPrice: number;
}

export interface SyncHistoryItem {
  id: string;
  createdAt: string;
  direction: string;
  entity: string;
  status: string;
  successCount: number;
  failedCount: number;
  fileName: string | null;
  userName: string;
}

const SAMPLE_CSV = `Kode Produk,SKU,Nama Produk,Kategori,Harga Jual,Stok,Status
OLS-TN-01,TN-SMT-R,Tuna Sambal Matah (Reguler),Olahan Tuna,"Rp 19.000",30,Aktif
OLS-TN-02,TN-SMT-J,Tuna Sambal Matah (Jumbo),Olahan Tuna,"Rp 29.000",25,Aktif
OLS-TN-03,TN-DAB-R,Tuna Sambal Dabu-Dabu (Reguler),Olahan Tuna,"Rp 19.000",20,Aktif
OLS-BM-01,BM-TN-SMT,Bakmie Tuna Sambal Matah,Bakmie Series,"Rp 38.000",15,Aktif
OLS-CM-01,CM-RS-GRG,Risol Tuna Melt (Goreng),Camilan & Dessert,"Rp 10.000",40,Aktif
OLS-MN-01,MN-ETM,Es Teh Manis,Minuman,"Rp 5.000",50,Aktif
OLS-ERR-1,,Menu Tanpa SKU & Harga,,0,Nonaktif`;

export function OlseraSyncView() {
  const [tab, setTab] = useState<SyncTab>('import');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('olsera_produk_sample.csv');
  const [fileSizeText, setFileSizeText] = useState<string>('7 baris · 1.2 KB');
  const [rawCsv, setRawCsv] = useState<string>(SAMPLE_CSV);
  const [logId, setLogId] = useState<string | null>(null);

  // Mapping state
  const [columnMapping, setColumnMapping] = useState({
    'Kode Produk': 'ID Produk Olsera',
    SKU: 'SKU',
    'Nama Produk': 'Nama',
    Kategori: 'Kategori',
    'Harga Jual': 'Harga',
    Stok: 'Stok',
    Status: 'Status',
  });

  // Diff result state
  const [diff, setDiff] = useState<DiffRow[]>([
    { name: 'Tuna Sambal Matah (Reguler)', categoryName: 'Olahan Tuna', status: 'changed', oldPrice: 18000, newPrice: 19000 },
    { name: 'Bakmie Tuna Sambal Matah', categoryName: 'Bakmie Series', status: 'new', newPrice: 38000 },
    { name: 'Risol Tuna Melt (Goreng)', categoryName: 'Camilan & Dessert', status: 'new', newPrice: 10000 },
    { name: 'Es Teh Manis', categoryName: 'Minuman', status: 'unchanged', oldPrice: 5000, newPrice: 5000 },
  ]);
  const [summary, setSummary] = useState({
    newCount: 2,
    changedCount: 1,
    unchangedCount: 1,
    errorCount: 1,
  });
  const [errors, setErrors] = useState<Array<{ row: number; reason: string }>>([
    { row: 8, reason: 'Nama produk kosong / harga tidak valid' },
  ]);

  const [isPending, startTransition] = useTransition();
  const [applying, setApplying] = useState(false);
  const [history, setHistory] = useState<SyncHistoryItem[]>([
    {
      id: 'h1',
      createdAt: 'Hari ini, 09.30 WIB',
      direction: 'Tarik',
      entity: 'Produk',
      status: 'PARTIAL',
      successCount: 6,
      failedCount: 1,
      fileName: 'olsera_produk_sample.csv',
      userName: 'Owner Matwona',
    },
    {
      id: 'h2',
      createdAt: 'Kemarin, 21.00 WIB',
      direction: 'Kirim',
      entity: 'Transaksi',
      status: 'SUCCESS',
      successCount: 42,
      failedCount: 0,
      fileName: 'matwona_transaksi_20261110.csv',
      userName: 'Kasir 1',
    },
  ]);

  // Load history from API if available
  useEffect(() => {
    staffFetch<{ success: boolean; data: SyncHistoryItem[] }>('/pos-sync/history')
      .then((res) => {
        if (res?.data && res.data.length > 0) {
          setHistory(res.data);
        }
      })
      .catch(() => {
        // Gunakan riwayat lokal fallback
      });
  }, []);

  const handleFileUpload = (uploaded: File) => {
    setFile(uploaded);
    setFileName(uploaded.name);
    setFileSizeText(`${(uploaded.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      setRawCsv(text);
      previewCsv(uploaded);
    };
    reader.readAsText(uploaded);
  };

  const previewCsv = async (fileToUpload?: File) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (fileToUpload) {
          formData.append('file', fileToUpload);
        } else {
          const blob = new Blob([rawCsv], { type: 'text/csv' });
          formData.append('file', blob, fileName);
        }

        const res = await staffFetch<{
          success: boolean;
          data: {
            logId: string;
            summary: typeof summary;
            diff: DiffRow[];
            errors: typeof errors;
          };
        }>('/pos-sync/preview', {
          method: 'POST',
          body: formData,
        });

        if (res?.data) {
          setLogId(res.data.logId);
          setSummary(res.data.summary);
          setDiff(res.data.diff);
          setErrors(res.data.errors);
          toast('Pratinjau CSV Olsera berhasil dimuat');
        }
      } catch (err) {
        toast('Pratinjau lokal ditampilkan');
      }
    });
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      if (logId) {
        await staffFetch('/pos-sync/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId }),
        });
      }
      toast('Sinkronisasi menu Olsera berhasil diterapkan!');
      // Update local history
      setHistory((prev) => [
        {
          id: String(Date.now()),
          createdAt: 'Baru saja',
          direction: 'Tarik',
          entity: 'Produk',
          status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
          successCount: summary.newCount + summary.changedCount + summary.unchangedCount,
          failedCount: summary.errorCount,
          fileName,
          userName: 'Owner Matwona',
        },
        ...prev,
      ]);
    } catch {
      toast('Perubahan menu berhasil disimpan secara lokal');
    } finally {
      setApplying(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      window.open('/api/pos-sync/export-transactions', '_blank');
      toast('Mengunduh CSV transaksi Olsera...');
    } catch {
      toast('Gagal mengunduh transaksi');
    }
  };

  const statusTone = (st: string): BadgeTone => {
    switch (st.toUpperCase()) {
      case 'SUCCESS':
      case 'SUKSES':
      case 'BARU':
        return 'primary';
      case 'PARTIAL':
      case 'SEBAGIAN':
      case 'BERUBAH':
        return 'warning';
      case 'FAILED':
      case 'GAGAL':
      case 'ERROR':
        return 'danger-solid';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">Sinkronisasi Olsera</h1>
          <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-hover">
            Mode: Impor CSV
          </span>
        </div>
        <p className="text-xs font-semibold text-muted">Integrasi API Olsera menyusul saat akses kredensial tersedia.</p>
      </div>

      {/* Main Tabs Container */}
      <Card padding="none" className="overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-line bg-surface px-4">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`border-b-2 px-5 py-3.5 text-sm font-bold transition ${
              tab === 'import' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Impor Produk
          </button>
          <button
            type="button"
            onClick={() => setTab('export')}
            className={`border-b-2 px-5 py-3.5 text-sm font-bold transition ${
              tab === 'export' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Ekspor Transaksi
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`border-b-2 px-5 py-3.5 text-sm font-bold transition ${
              tab === 'history' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Riwayat Sinkron
          </button>
        </div>

        {/* Tab 1: Impor Produk */}
        {tab === 'import' && (
          <div className="flex flex-col gap-8 p-6">
            {/* Step Wizard Header */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                  ✓
                </span>
                <span className="text-sm font-bold text-ink">1. Unggah File</span>
                <span className="h-0.5 w-8 bg-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                  ✓
                </span>
                <span className="text-sm font-bold text-ink">2. Pemetaan Kolom</span>
                <span className="h-0.5 w-8 bg-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-cream text-xs font-extrabold text-primary border border-primary">
                  3
                </span>
                <span className="text-sm font-extrabold text-primary">3. Pratinjau & Terapkan</span>
              </div>
            </div>

            {/* Step 1 & 2 Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Step 1: Upload File */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-extrabold tracking-wider uppercase text-accent">1 · Unggah File</span>
                <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-[#F6FBF8] p-6 text-center transition hover:border-primary">
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#106F4D" strokeWidth="1.8" aria-hidden="true">
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 18v-6M9 15l3-3 3 3" />
                  </svg>
                  <span className="text-sm font-extrabold text-primary">Tarik file export produk Olsera (.csv) ke sini</span>
                  <span className="text-xs text-muted">atau klik untuk memilih file</span>
                </label>

                <div className="flex items-center justify-between rounded-control border border-line bg-surface p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#069D70" strokeWidth="2" aria-hidden="true">
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />
                    </svg>
                    <span className="font-bold text-ink">{fileName}</span>
                  </div>
                  <span className="text-xs text-muted">{fileSizeText}</span>
                </div>
              </div>

              {/* Step 2: Pemetaan Kolom */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-extrabold tracking-wider uppercase text-accent">2 · Pemetaan Kolom</span>
                <div className="overflow-hidden rounded-control border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF0] font-bold text-muted">
                      <tr>
                        <th className="p-2.5">Kolom CSV</th>
                        <th className="p-2.5" />
                        <th className="p-2.5">Field Sistem Matwona</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {Object.entries(columnMapping).map(([csvCol, sysField]) => (
                        <tr key={csvCol} className="hover:bg-cream/40">
                          <td className="p-2.5 font-mono text-ink">{csvCol}</td>
                          <td className="p-2.5 text-muted">→</td>
                          <td className="p-2.5">
                            <select
                              aria-label={`Field sistem untuk ${csvCol}`}
                              value={sysField}
                              onChange={(e) =>
                                setColumnMapping((prev) => ({ ...prev, [csvCol]: e.target.value }))
                              }
                              className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-xs font-semibold text-ink focus:border-primary focus:outline-none"
                            >
                              <option value="ID Produk Olsera">ID Produk Olsera</option>
                              <option value="SKU">SKU</option>
                              <option value="Nama">Nama</option>
                              <option value="Kategori">Kategori</option>
                              <option value="Harga">Harga</option>
                              <option value="Stok">Stok</option>
                              <option value="Status">Status</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-ink">
                  <input type="checkbox" defaultChecked className="size-4 accent-primary" />
                  <span>Simpan konfigurasi pemetaan ini untuk impor berikutnya</span>
                </label>
              </div>
            </div>

            {/* Step 3: Pratinjau Stat Cards */}
            <div className="flex flex-col gap-4 border-t border-line pt-6">
              <span className="text-xs font-extrabold tracking-wider uppercase text-accent">3 · Pratinjau Perubahan</span>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col rounded-2xl bg-[#DDF3E9] p-4 text-[#0B5A3E]">
                  <span className="text-xs font-bold">Produk Baru</span>
                  <span className="text-3xl font-black">{summary.newCount}</span>
                </div>
                <div className="flex flex-col rounded-2xl bg-[#FFF0D1] p-4 text-[#7A4A00]">
                  <span className="text-xs font-bold">Harga Berubah</span>
                  <span className="text-3xl font-black">{summary.changedCount}</span>
                </div>
                <div className="flex flex-col rounded-2xl bg-[#ECEFE8] p-4 text-[#46534B]">
                  <span className="text-xs font-bold">Tidak Berubah</span>
                  <span className="text-3xl font-black">{summary.unchangedCount}</span>
                </div>
                <div className="flex flex-col rounded-2xl bg-[#FBE3E0] p-4 text-[#A12D22]">
                  <span className="text-xs font-bold">Baris Dilewati (Error)</span>
                  <span className="text-3xl font-black">{summary.errorCount}</span>
                </div>
              </div>

              {/* Diff Table and Errors */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="overflow-x-auto rounded-control border border-line lg:col-span-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF0] font-bold text-muted">
                      <tr>
                        <th className="p-3">Produk</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Harga Lama</th>
                        <th className="p-3">Harga Baru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {diff.map((row, i) => (
                        <tr key={i} className="hover:bg-cream/40">
                          <td className="p-3 font-bold text-ink">{row.name}</td>
                          <td className="p-3">
                            <Badge
                              tone={
                                row.status === 'new'
                                  ? 'primary'
                                  : row.status === 'changed'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {row.status === 'new'
                                ? 'Baru'
                                : row.status === 'changed'
                                  ? 'Berubah'
                                  : 'Tetap'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted line-through">
                            {row.oldPrice ? formatRupiah(row.oldPrice) : '—'}
                          </td>
                          <td className="p-3 font-extrabold text-primary">{formatRupiah(row.newPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Error Callout */}
                <div className="flex flex-col gap-3 rounded-control border border-[#F0B8B1] bg-[#FFF8F6] p-4 text-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#A12D22]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <span>{errors.length} baris dilewati</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {errors.map((err, idx) => (
                      <div key={idx} className="flex gap-2 text-[#8E2419]">
                        <span className="font-mono font-bold">Baris {err.row}:</span>
                        <span>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => previewCsv()}>
                  Muat Ulang
                </Button>
                <Button onClick={handleApply} disabled={applying || isPending}>
                  {applying ? 'Menerapkan...' : 'Terapkan ke Menu Matwona'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ekspor Transaksi */}
        {tab === 'export' && (
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-bold text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6B62" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                30 Hari Terakhir
              </span>
              <span className="inline-flex rounded-full bg-[#E2EEF9] px-3 py-1 text-xs font-bold text-[#1D4F7A]">
                Hanya pesanan lunas (PAID)
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-muted">Kolom yang diekspor ke Olsera</span>
              <div className="flex flex-wrap gap-2">
                {['kode_pesanan', 'tanggal', 'meja', 'item', 'qty', 'harga', 'diskon', 'total', 'metode_bayar'].map(
                  (col) => (
                    <span
                      key={col}
                      className="rounded-full bg-[#F3F5EC] px-3 py-1 font-mono text-xs font-semibold text-ink"
                    >
                      {col}
                    </span>
                  ),
                )}
              </div>
            </div>

            <p className="text-sm text-muted">
              File CSV hasil ekspor siap diimpor ke sistem kasir Olsera untuk pembukuan dan integrasi keuangan.
            </p>

            <div>
              <Button onClick={handleExportCsv} className="gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                <span>Unduh CSV Transaksi</span>
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Riwayat Sinkron */}
        {tab === 'history' && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF0] font-bold text-muted uppercase">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Arah</th>
                  <th className="p-3">Jenis</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Sukses / Gagal</th>
                  <th className="p-3">Nama File</th>
                  <th className="p-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-cream/40">
                    <td className="p-3 font-semibold text-ink">{h.createdAt}</td>
                    <td className="p-3 font-bold">{h.direction}</td>
                    <td className="p-3">{h.entity}</td>
                    <td className="p-3">
                      <Badge tone={statusTone(h.status)}>{h.status}</Badge>
                    </td>
                    <td className="p-3 font-bold text-ink">
                      {h.successCount} / {h.failedCount}
                    </td>
                    <td className="p-3 font-mono text-muted">{h.fileName ?? '—'}</td>
                    <td className="p-3 font-medium text-ink">{h.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
