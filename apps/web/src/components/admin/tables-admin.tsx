'use client';

import { useState } from 'react';
import { ErrorCode, TABLE_QR_LAYOUTS } from 'shared';
import type { DiningTableDto, TableQrLayout } from 'shared';
import { Badge, Button, Card } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { downloadTablesQr } from '@/lib/tables-qr-download';
import { ConfirmSheet } from './confirm-sheet';
import { TableFormSheet } from './table-form-sheet';
import { useTables, useTablesMutations } from './use-tables-admin';

const OUTLET_SLUG = process.env.NEXT_PUBLIC_OUTLET_SLUG ?? 'matwona';
const LAYOUT_LABEL: Record<TableQrLayout, string> = { a6: 'A6 (1 QR per halaman)', a4grid: 'A4 (4 QR per halaman)' };

type Dialog = { kind: 'form'; table: DiningTableDto | null } | { kind: 'regenerate'; table: DiningTableDto } | null;

const messageOf = (error: unknown) =>
  error instanceof ApiClientError ? error.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';

/** Kelola meja & cetak QR (FR-011, PRD 2.2.8). */
export function TablesAdmin() {
  const tables = useTables();
  const m = useTablesMutations();
  const [layout, setLayout] = useState<TableQrLayout>('a6');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const list = tables.data ?? [];
  const activeSelected = list.filter((t) => t.isActive && selected.has(t.id)).map((t) => t.id);

  const open = (next: Exclude<Dialog, null>) => {
    setServerError(null);
    setDialogKey((k) => k + 1);
    setDialog(next);
  };
  const done = (text: string) => {
    setDialog(null);
    setNotice({ tone: 'ok', text });
  };
  const fail = (error: unknown) => {
    if (error instanceof ApiClientError && error.error.code === ErrorCode.TABLE_LABEL_TAKEN) return setServerError(error.message);
    setServerError(messageOf(error));
  };

  const download = async (ids?: string[]) => {
    setNotice(null);
    setDownloading(true);
    try {
      await downloadTablesQr({ ids, layout });
      setNotice({ tone: 'ok', text: 'PDF QR sedang diunduh. Cetak tanpa diperkecil (skala 100%).' });
    } catch (error) {
      setNotice({ tone: 'error', text: messageOf(error) });
    } finally {
      setDownloading(false);
    }
  };

  const toggleActive = (table: DiningTableDto) => {
    setNotice(null);
    m.update.mutate(
      { id: table.id, input: { isActive: !table.isActive } },
      {
        onSuccess: () => setNotice({ tone: 'ok', text: `Meja ${table.label} ${table.isActive ? 'dinonaktifkan' : 'diaktifkan'}.` }),
        onError: (e) => setNotice({ tone: 'error', text: messageOf(e) }),
      },
    );
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (tables.isPending) return <p className="p-4 text-muted">Memuat meja…</p>;
  if (tables.isError) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p className="text-danger">Data meja belum bisa dimuat.</p>
        <Button variant="secondary" onClick={() => void tables.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={notice.tone === 'error' ? 'rounded-xl bg-danger-soft p-3 text-sm text-danger' : 'rounded-xl bg-primary-soft p-3 text-sm text-primary'}
        >
          {notice.text}
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold text-ink">Cetak QR</h2>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink sm:max-w-xs">
          Ukuran kertas
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as TableQrLayout)}
            className="min-h-11 rounded-xl border-2 border-line bg-surface px-3 text-base font-normal"
          >
            {TABLE_QR_LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button loading={downloading} disabled={!list.some((t) => t.isActive)} onClick={() => void download()}>
            Unduh QR semua meja aktif
          </Button>
          <Button variant="secondary" disabled={downloading || activeSelected.length === 0} onClick={() => void download(activeSelected)}>
            Unduh QR terpilih ({activeSelected.length})
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Meja ({list.length})</h2>
        <Button onClick={() => open({ kind: 'form', table: null })}>+ Meja</Button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-muted">
          Belum ada meja. Tambahkan meja lalu cetak QR-nya.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((table) => (
            <li key={table.id}>
              <Card role="article" aria-label={`Meja ${table.label}`} muted={!table.isActive} className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(table.id)}
                      disabled={!table.isActive}
                      onChange={() => toggleSelect(table.id)}
                      aria-label={`Pilih Meja ${table.label}`}
                      className="size-5 accent-primary"
                    />
                    <span className="text-lg font-bold text-ink">Meja {table.label}</span>
                  </label>
                  <Badge tone={table.isActive ? 'success' : 'neutral'}>{table.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
                <p className="text-sm text-muted">{table.capacity ? `Kapasitas ${table.capacity} orang` : 'Kapasitas belum diisi'}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Button
                    role="switch"
                    aria-checked={table.isActive}
                    aria-label={`Aktif: Meja ${table.label}`}
                    variant={table.isActive ? 'secondary' : 'primary'}
                    disabled={m.update.isPending && m.update.variables?.id === table.id}
                    onClick={() => toggleActive(table)}
                  >
                    {table.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                  <Button variant="ghost" onClick={() => open({ kind: 'form', table })}>
                    Ubah
                  </Button>
                  {table.isActive && (
                    <>
                      <Button variant="ghost" disabled={downloading} onClick={() => void download([table.id])}>
                        Unduh QR
                      </Button>
                      <a
                        href={`/m/${OUTLET_SLUG}/t/${table.qrToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-primary underline"
                      >
                        Buka menu
                      </a>
                    </>
                  )}
                  <Button variant="danger-ghost" onClick={() => open({ kind: 'regenerate', table })}>
                    Ganti QR
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === 'form' && (
        <TableFormSheet
          key={dialogKey}
          table={dialog.table}
          busy={m.create.isPending || m.update.isPending}
          serverError={serverError}
          onClose={() => setDialog(null)}
          onCreate={(input) =>
            m.create.mutate(input, {
              onSuccess: (created) => done(created.length > 1 ? `${created.length} meja ditambahkan.` : `Meja ${created[0]?.label} ditambahkan.`),
              onError: fail,
            })
          }
          onUpdate={(input) =>
            dialog.table && m.update.mutate({ id: dialog.table.id, input }, { onSuccess: () => done(`Meja ${input.label ?? dialog.table!.label} disimpan.`), onError: fail })
          }
        />
      )}

      <ConfirmSheet
        open={dialog?.kind === 'regenerate'}
        title={dialog?.kind === 'regenerate' ? `Ganti QR Meja ${dialog.table.label}?` : ''}
        confirmLabel="Ganti QR"
        busy={m.regenerate.isPending}
        error={serverError}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          dialog?.kind === 'regenerate' &&
          m.regenerate.mutate(dialog.table.id, {
            onSuccess: () => done(`QR Meja ${dialog.table.label} diganti. QR lama tidak berlaku lagi — cetak & tempel QR yang baru.`),
            onError: fail,
          })
        }
      >
        <p>QR yang sekarang tertempel di meja langsung tidak bisa dipakai memesan. Pakai ini bila QR rusak atau disalahgunakan.</p>
      </ConfirmSheet>
    </div>
  );
}
