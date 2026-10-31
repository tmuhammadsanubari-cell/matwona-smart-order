'use client';

import { useMemo, useState } from 'react';
import { ErrorCode, formatRupiah } from 'shared';
import type { CategoryDto, MenuItemDto } from 'shared';
import { MenuPhoto } from '@/components/menu/menu-item-card';
import { Badge, BottomSheet, Button, Card, cx, Switch } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { normalizeSearch, photoToneFor } from '@/lib/menu';
import type { MenuItemFieldErrors } from '@/lib/menu-form';
import { AdminActions } from './admin-shell';
import { CategoryFormSheet } from './category-form-sheet';
import { ConfirmSheet } from './confirm-sheet';
import { MenuItemFormSheet } from './menu-item-form-sheet';
import { useCategories, useMenuAdminMutations, useMenuItems } from './use-menu-admin';

type Dialog =
  | { kind: 'categories' }
  | { kind: 'category'; category: CategoryDto | null }
  | { kind: 'item'; item: MenuItemDto | null }
  | { kind: 'archive'; item: MenuItemDto }
  | { kind: 'delete-category'; category: CategoryDto }
  | null;

const messageOf = (error: unknown) =>
  error instanceof ApiClientError ? error.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';

const syncFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  sync: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
};

const ICON_BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink hover:bg-neutral-soft';
const TH = 'border-b border-line px-2.5 py-3 text-left text-xs font-extrabold tracking-wide whitespace-nowrap text-muted uppercase';
const TD = 'border-b border-line/60 px-2.5 py-2.5 whitespace-nowrap';

/**
 * Kelola kategori & menu (FR-010, PRD 2.2.7; desain A2): panel kategori sebagai filter, tabel menu dengan
 * sakelar ketersediaan, pencarian nama/SKU, tab Aktif/Diarsipkan. Urutan & ubah kategori di sheet
 * "Kelola Kategori". Upload foto menyusul di S2-11.
 */
export function MenuAdmin() {
  const categories = useCategories();
  const [showArchived, setShowArchived] = useState(false);
  const items = useMenuItems(showArchived);
  const m = useMenuAdminMutations();
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<MenuItemFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);
  const categoryName = new Map(categoryList.map((c) => [c.id, c.name]));
  const q = normalizeSearch(query);
  const visibleItems = (items.data ?? []).filter(
    (i) =>
      (filter === 'all' || i.categoryId === filter) &&
      (!q || normalizeSearch(i.name).includes(q) || normalizeSearch(i.sku ?? '').includes(q)),
  );

  const open = (next: Exclude<Dialog, null>) => {
    setServerError(null);
    setServerFieldErrors({});
    setDialogKey((k) => k + 1);
    setDialog(next);
  };
  const close = () => setDialog(null);
  const done = (message: string) => {
    setDialog(null);
    setNotice(message);
  };
  const fail = (error: unknown) => {
    if (error instanceof ApiClientError && error.error.code === ErrorCode.SKU_TAKEN) {
      setServerFieldErrors({ sku: error.message });
      return;
    }
    setServerError(messageOf(error));
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = categoryList.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setNotice(null);
    m.reorderCategories.mutate(ids, { onError: (e) => setNotice(messageOf(e)) });
  };

  const toggleAvailability = (item: MenuItemDto) => {
    setNotice(null);
    m.setAvailability.mutate(
      { id: item.id, isAvailable: !item.isAvailable },
      {
        onSuccess: () => setNotice(`${item.name} ditandai ${item.isAvailable ? 'Habis' : 'Tersedia'}.`),
        onError: (e) => setNotice(messageOf(e)),
      },
    );
  };

  // Hanya kategori yang menahan seluruh halaman; daftar menu (aktif/arsip) memuat di bagiannya sendiri.
  if (categories.isPending) return <p className="p-4 text-muted">Memuat menu…</p>;
  if (categories.isError || (items.isError && !items.data)) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p className="text-danger">Data menu belum bisa dimuat.</p>
        <Button variant="secondary" onClick={() => void Promise.all([categories.refetch(), items.refetch()])}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    // min-w-0: tabel lebar di-scroll di dalam kartunya, bukan melebarkan halaman (HP 360 px).
    <div className="flex min-w-0 flex-col gap-4">
      <AdminActions>
        <Button variant="secondary" onClick={() => open({ kind: 'categories' })}>
          Kelola Kategori
        </Button>
        <Button disabled={categoryList.length === 0} onClick={() => open({ kind: 'item', item: null })}>
          + Tambah Menu
        </Button>
      </AdminActions>

      {notice && (
        <p role="status" className="rounded-control bg-primary-soft p-3 text-sm font-semibold text-primary-hover">
          {notice}
        </p>
      )}

      {/* Panel kategori di samping hanya di layar sangat lebar; di bawahnya tabel butuh lebar penuh. */}
      <div className="flex min-w-0 flex-col gap-4.5 2xl:flex-row 2xl:items-start">
        <Card padding="sm" className="flex flex-col gap-1 2xl:w-60 2xl:shrink-0">
          <h2 className="px-1.5 py-1 text-xs font-extrabold tracking-wider text-muted uppercase">Kategori</h2>
          <ul className="flex gap-1 overflow-x-auto 2xl:flex-col [scrollbar-width:none]">
            {[{ id: 'all', name: 'Semua kategori', itemCount: null as number | null }, ...categoryList].map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={filter === c.id}
                  aria-label={c.itemCount === null ? c.name : `${c.name}, ${c.itemCount} menu`}
                  onClick={() => setFilter(c.id)}
                  className={cx(
                    'flex min-h-11 w-full items-center gap-2 rounded-control px-2.5 text-left text-sm whitespace-nowrap',
                    filter === c.id ? 'bg-primary-soft font-extrabold text-primary' : 'font-semibold text-ink hover:bg-neutral-soft',
                  )}
                >
                  <span className="flex-1">{c.name}</span>
                  {c.itemCount !== null && <Badge tone="neutral">{c.itemCount}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="none" className="min-w-0 flex-1 overflow-hidden">
          <section aria-labelledby="judul-menu">
            <h2 id="judul-menu" className="sr-only">
              {showArchived ? 'Menu diarsipkan' : 'Menu aktif'}
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
              <div role="group" aria-label="Tampilkan menu" className="flex gap-1 rounded-control bg-neutral-soft p-1">
                {[
                  { label: 'Aktif', archived: false },
                  { label: 'Diarsipkan', archived: true },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    aria-pressed={showArchived === tab.archived}
                    onClick={() => setShowArchived(tab.archived)}
                    className={cx(
                      'min-h-11 rounded-lg px-3.5 text-[13px]',
                      showArchived === tab.archived ? 'bg-surface font-extrabold text-primary shadow-sm' : 'font-bold text-neutral',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <label className="flex min-h-11 min-w-0 flex-1 basis-56 items-center gap-2 rounded-control border-[1.5px] border-line-strong px-3 focus-within:border-primary sm:max-w-64">
                <Icon d={ICON.search} className="shrink-0 text-muted" />
                <input
                  type="search"
                  aria-label="Cari menu"
                  placeholder="Cari nama / SKU"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 self-stretch bg-transparent text-base focus:outline-none"
                />
              </label>
            </div>

            {items.isPending ? (
              <p className="p-4 text-muted" aria-busy="true">
                Memuat {showArchived ? 'arsip' : 'menu'}…
              </p>
            ) : visibleItems.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">
                {q
                  ? 'Tidak ada menu yang cocok dengan pencarian.'
                  : showArchived
                    ? 'Belum ada menu yang diarsipkan.'
                    : 'Belum ada menu di kategori ini.'}
              </p>
            ) : (
              // relative: teks sr-only (position absolute) di header tabel ikut terpotong wadah scroll,
              // bukan melebarkan halaman.
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>Menu</th>
                      <th scope="col" className={TH}>Ketersediaan</th>
                      <th scope="col" className={TH}>Harga</th>
                      <th scope="col" className={TH}>Stok</th>
                      <th scope="col" className={TH}>SKU</th>
                      <th scope="col" className={TH}>Sinkron</th>
                      {!showArchived && (
                        <th scope="col" className={TH}>
                          <span className="sr-only">Aksi</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const soldOutByStock = item.stock === 0;
                      const soldOut = !item.isAvailable || soldOutByStock;
                      const category = categoryName.get(item.categoryId) ?? '–';
                      return (
                        <tr key={item.id} aria-label={item.name} className={cx(!item.isArchived && soldOut && 'bg-danger-soft/30')}>
                          <td className={TD}>
                            <div className="flex items-center gap-2.5">
                              <MenuPhoto
                                item={item}
                                tone={soldOut ? 'none' : photoToneFor(category)}
                                width={48}
                                className="h-9 w-12 shrink-0 rounded-lg"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-ink">{item.name}</span>
                                <span className="text-xs text-muted">{category}</span>
                              </div>
                            </div>
                          </td>
                          <td className={TD}>
                            {item.isArchived ? (
                              <Badge>Diarsipkan</Badge>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={item.isAvailable}
                                  aria-label={`Tersedia: ${item.name}`}
                                  disabled={m.setAvailability.isPending && m.setAvailability.variables?.id === item.id}
                                  onChange={() => toggleAvailability(item)}
                                />
                                <span
                                  className={cx('text-[13px] font-bold', item.isAvailable ? 'text-primary-hover' : 'text-danger-strong')}
                                >
                                  {item.isAvailable ? 'Tersedia' : 'Habis'}
                                </span>
                                {item.isAvailable && soldOutByStock && (
                                  <Badge tone="danger-solid" title="Stok 0: pelanggan melihat menu ini sebagai Habis">
                                    Stok 0 · tampil Habis
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={cx(TD, 'font-bold')}>{formatRupiah(item.price)}</td>
                          <td className={TD}>{item.stock ?? <span className="text-muted" title="Stok tidak dilacak">–</span>}</td>
                          <td className={cx(TD, 'font-mono text-[13px] text-muted')}>{item.sku ?? '–'}</td>
                          <td className={TD}>
                            {item.olseraProductId ? (
                              <span className="flex items-center gap-1.5 text-xs text-muted">
                                <Icon d={ICON.sync} className="text-accent" />
                                <span>Tersinkron Olsera</span>
                                {item.lastSyncedAt && <span>· {syncFormat.format(new Date(item.lastSyncedAt))}</span>}
                              </span>
                            ) : (
                              <span className="text-muted">–</span>
                            )}
                          </td>
                          {!showArchived && (
                            <td className={TD}>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  aria-label={`Ubah ${item.name}`}
                                  onClick={() => open({ kind: 'item', item })}
                                  className={ICON_BUTTON}
                                >
                                  <Icon d={ICON.edit} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Arsipkan ${item.name}`}
                                  onClick={() => open({ kind: 'archive', item })}
                                  className={ICON_BUTTON}
                                >
                                  <Icon d={ICON.archive} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Card>
      </div>

      <BottomSheet
        open={dialog?.kind === 'categories'}
        onClose={close}
        title="Kelola kategori"
        footer={
          <Button fullWidth onClick={() => open({ kind: 'category', category: null })}>
            + Kategori
          </Button>
        }
      >
        <ul className="flex flex-col">
          {categoryList.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="font-bold text-ink">{category.name}</p>
                <p className="text-sm text-muted">
                  {category.itemCount} menu{!category.isActive && ' · disembunyikan dari pelanggan'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  aria-label={`Naikkan ${category.name}`}
                  disabled={index === 0 || m.reorderCategories.isPending}
                  onClick={() => move(index, -1)}
                  className={cx(ICON_BUTTON, 'text-lg font-bold disabled:cursor-not-allowed disabled:bg-disabled disabled:text-neutral')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Turunkan ${category.name}`}
                  disabled={index === categoryList.length - 1 || m.reorderCategories.isPending}
                  onClick={() => move(index, 1)}
                  className={cx(ICON_BUTTON, 'text-lg font-bold disabled:cursor-not-allowed disabled:bg-disabled disabled:text-neutral')}
                >
                  ↓
                </button>
                <Button variant="ghost" onClick={() => open({ kind: 'category', category })}>
                  Ubah
                </Button>
                <Button variant="danger-ghost" onClick={() => open({ kind: 'delete-category', category })}>
                  Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {dialog?.kind === 'category' && (
        <CategoryFormSheet
          key={dialogKey}
          category={dialog.category}
          busy={m.createCategory.isPending || m.updateCategory.isPending}
          serverError={serverError}
          onClose={close}
          onCreate={(input) => m.createCategory.mutate(input, { onSuccess: () => done(`Kategori ${input.name} ditambahkan.`), onError: fail })}
          onUpdate={(input) =>
            dialog.category &&
            m.updateCategory.mutate({ id: dialog.category.id, input }, { onSuccess: () => done('Kategori disimpan.'), onError: fail })
          }
        />
      )}

      {dialog?.kind === 'item' && (
        <MenuItemFormSheet
          key={dialogKey}
          item={dialog.item}
          categories={categoryList}
          defaultCategoryId={filter === 'all' ? undefined : filter}
          busy={m.createItem.isPending || m.updateItem.isPending}
          serverError={serverError}
          serverFieldErrors={serverFieldErrors}
          onClose={close}
          onCreate={(input) => m.createItem.mutate(input, { onSuccess: () => done(`${input.name} ditambahkan.`), onError: fail })}
          onUpdate={(input) =>
            dialog.item &&
            m.updateItem.mutate({ id: dialog.item.id, input }, { onSuccess: () => done(`${dialog.item!.name} disimpan.`), onError: fail })
          }
        />
      )}

      <ConfirmSheet
        open={dialog?.kind === 'archive'}
        title={dialog?.kind === 'archive' ? `Arsipkan ${dialog.item.name}?` : ''}
        confirmLabel="Arsipkan"
        busy={m.archiveItem.isPending}
        error={serverError}
        onClose={close}
        onConfirm={() =>
          dialog?.kind === 'archive' &&
          m.archiveItem.mutate(dialog.item.id, { onSuccess: () => done(`${dialog.item.name} diarsipkan.`), onError: fail })
        }
      >
        <p>Menu tidak lagi tampil di menu pelanggan. Riwayat pesanan & analitik tetap tersimpan (tidak dihapus permanen).</p>
      </ConfirmSheet>

      <ConfirmSheet
        open={dialog?.kind === 'delete-category'}
        title={dialog?.kind === 'delete-category' ? `Hapus kategori ${dialog.category.name}?` : ''}
        confirmLabel="Hapus"
        busy={m.deleteCategory.isPending}
        error={serverError}
        onClose={close}
        onConfirm={() =>
          dialog?.kind === 'delete-category' &&
          m.deleteCategory.mutate(dialog.category.id, { onSuccess: () => done(`Kategori ${dialog.category.name} dihapus.`), onError: fail })
        }
      >
        <p>Hanya kategori tanpa menu (termasuk menu yang diarsipkan) yang bisa dihapus.</p>
      </ConfirmSheet>
    </div>
  );
}
