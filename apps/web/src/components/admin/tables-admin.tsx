'use client';

import { useState } from 'react';
import { ErrorCode, TABLE_QR_LAYOUTS } from 'shared';
import type { DiningTableDto, TableQrLayout } from 'shared';
import { Button, Card, cx, Switch } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { downloadTablesQr } from '@/lib/tables-qr-download';
import { AdminActions } from './admin-shell';
import { ConfirmSheet } from './confirm-sheet';
import { TableFormSheet } from './table-form-sheet';
import { useTables, useTablesMutations } from './use-tables-admin';

const OUTLET_SLUG = process.env.NEXT_PUBLIC_OUTLET_SLUG ?? 'matwona';
const LAYOUT_LABEL: Record<TableQrLayout, string> = { a6: 'A6 per meja', a4grid: 'Grid A4 (4 per lembar)' };

// Warna teks per item (text-ink / text-danger), bukan di sini: dua kelas warna di satu elemen tidak menjamin pemenang.
const MENU_ITEM = 'flex min-h-11 w-full items-center rounded-lg px-2.5 text-left text-sm font-semibold hover:bg-neutral-soft';

type Dialog = { kind: 'form'; table: DiningTableDto | null } | { kind: 'regenerate'; table: DiningTableDto } | null;

const messageOf = (error: unknown) =>
  error instanceof ApiClientError ? error.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';

/**
 * Kelola meja & cetak QR (FR-011, PRD 2.2.8; desain A3): kartu meja dengan sakelar aktif dan menu ⋯
 * (unduh QR, ubah, ganti QR, buka menu); unduh PDF semua meja aktif atau yang dipilih.
 */
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
    <div className="flex min-w-0 flex-col gap-4">
      <AdminActions>
        <Button onClick={() => open({ kind: 'form', table: null })}>+ Tambah Meja</Button>
        <div className="flex overflow-hidden rounded-control border-[1.5px] border-primary">
          {/* Tombol native: menyatu dengan pilihan ukuran kertas dalam satu bingkai (tanpa sudut sendiri). */}
          <button
            type="button"
            aria-busy={downloading || undefined}
            disabled={downloading || !list.some((t) => t.isActive)}
            onClick={() => void download()}
            className="inline-flex min-h-11 items-center gap-2 bg-surface px-4 text-sm font-bold text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:bg-disabled disabled:text-neutral"
          >
            {downloading ? 'Mengunduh…' : 'Unduh PDF QR'}
          </button>
          <select
            aria-label="Ukuran kertas"
            value={layout}
            onChange={(e) => setLayout(e.target.value as TableQrLayout)}
            className="min-h-11 border-l-[1.5px] border-primary bg-cream px-2.5 text-[13px] font-bold text-primary focus:outline-none"
          >
            {TABLE_QR_LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
      </AdminActions>

      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'rounded-control p-3 text-sm font-semibold',
            notice.tone === 'error' ? 'border border-danger/30 bg-danger-soft text-danger-strong' : 'bg-primary-soft text-primary-hover',
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted">
          {list.length} meja · {list.filter((t) => t.isActive).length} aktif
        </p>
        {activeSelected.length > 0 && (
          <Button variant="secondary" disabled={downloading} onClick={() => void download(activeSelected)}>
            Unduh QR terpilih ({activeSelected.length})
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong p-4 text-center text-sm text-muted">
          Belum ada meja. Tambahkan meja lalu cetak QR-nya.
        </p>
      ) : (
        // items-start: membuka menu ⋯ hanya memanjangkan kartu itu, bukan seluruh baris.
        <ul className="grid items-start gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
          {list.map((table) => {
            const menuId = `opsi-meja-${table.id}`;
            const expanded = menuOpen === table.id;
            return (
              <li key={table.id}>
                <Card
                  role="article"
                  aria-label={`Meja ${table.label}`}
                  muted={!table.isActive}
                  padding="sm"
                  className={cx('flex flex-col gap-2', !table.isActive && 'bg-neutral-soft')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex min-h-11 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(table.id)}
                        disabled={!table.isActive}
                        onChange={() => toggleSelect(table.id)}
                        aria-label={`Pilih Meja ${table.label}`}
                        className="size-5 accent-primary"
                      />
                      <span className="flex flex-col">
                        <span className={cx('text-2xl leading-tight font-extrabold', table.isActive ? 'text-primary' : 'text-muted')}>
                          {table.label}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {table.capacity ? `${table.capacity} kursi` : 'Kapasitas belum diisi'}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Opsi Meja ${table.label}`}
                      aria-expanded={expanded}
                      aria-controls={menuId}
                      onClick={() => setMenuOpen(expanded ? null : table.id)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-lg font-extrabold text-ink hover:bg-neutral-soft"
                    >
                      ⋯
                    </button>
                  </div>

                  {expanded && (
                    <div id={menuId} className="flex flex-col rounded-control border border-line bg-surface p-1 shadow-card">
                      {table.isActive && (
                        <>
                          <button
                            type="button"
                            className={cx(MENU_ITEM, 'text-ink')}
                            disabled={downloading}
                            onClick={() => void download([table.id])}
                          >
                            Unduh QR
                          </button>
                          <a href={`/m/${OUTLET_SLUG}/t/${table.qrToken}`} target="_blank" rel="noreferrer" className={cx(MENU_ITEM, 'text-ink')}>
                            Buka menu
                          </a>
                        </>
                      )}
                      <button type="button" className={cx(MENU_ITEM, 'text-ink')} onClick={() => open({ kind: 'form', table })}>
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={cx(MENU_ITEM, 'text-danger')}
                        onClick={() => open({ kind: 'regenerate', table })}
                      >
                        Ganti QR
                      </button>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className={cx('text-[13px] font-bold', table.isActive ? 'text-primary-hover' : 'text-muted')}>
                      {table.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <Switch
                      checked={table.isActive}
                      aria-label={`Aktif: Meja ${table.label}`}
                      disabled={m.update.isPending && m.update.variables?.id === table.id}
                      onChange={() => toggleActive(table)}
                    />
                  </div>
                </Card>
              </li>
            );
          })}
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
