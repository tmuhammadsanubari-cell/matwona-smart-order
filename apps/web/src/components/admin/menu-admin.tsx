'use client';

import { useState } from 'react';
import { ErrorCode, formatRupiah } from 'shared';
import type { CategoryDto, MenuItemDto } from 'shared';
import { Badge, Button, Card } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import type { MenuItemFieldErrors } from '@/lib/menu-form';
import { CategoryFormSheet } from './category-form-sheet';
import { ConfirmSheet } from './confirm-sheet';
import { MenuItemFormSheet } from './menu-item-form-sheet';
import { useCategories, useMenuAdminMutations, useMenuItems } from './use-menu-admin';

type Dialog =
  | { kind: 'category'; category: CategoryDto | null }
  | { kind: 'item'; item: MenuItemDto | null }
  | { kind: 'archive'; item: MenuItemDto }
  | { kind: 'delete-category'; category: CategoryDto }
  | null;

const messageOf = (error: unknown) =>
  error instanceof ApiClientError ? error.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';

/** Kelola kategori & menu (FR-010, PRD 2.2.7). Upload foto menyusul di S2-11. */
export function MenuAdmin() {
  const categories = useCategories();
  const [showArchived, setShowArchived] = useState(false);
  const items = useMenuItems(showArchived);
  const m = useMenuAdminMutations();
  const [filter, setFilter] = useState<string>('all');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<MenuItemFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const categoryList = categories.data ?? [];
  const categoryName = new Map(categoryList.map((c) => [c.id, c.name]));
  const visibleItems = (items.data ?? []).filter((i) => filter === 'all' || i.categoryId === filter);

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
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      {notice && (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm text-primary">
          {notice}
        </p>
      )}

      <section aria-labelledby="judul-kategori" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="judul-kategori" className="text-lg font-bold text-ink">
            Kategori
          </h2>
          <Button variant="secondary" onClick={() => open({ kind: 'category', category: null })}>
            + Kategori
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {categoryList.map((category, index) => (
            <li key={category.id}>
              <Card className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{category.name}</p>
                  <p className="text-sm text-muted">
                    {category.itemCount} menu{!category.isActive && ' · disembunyikan dari pelanggan'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" className="w-11 px-0" aria-label={`Naikkan ${category.name}`} disabled={index === 0 || m.reorderCategories.isPending} onClick={() => move(index, -1)}>
                    ↑
                  </Button>
                  <Button variant="ghost" className="w-11 px-0" aria-label={`Turunkan ${category.name}`} disabled={index === categoryList.length - 1 || m.reorderCategories.isPending} onClick={() => move(index, 1)}>
                    ↓
                  </Button>
                  <Button variant="ghost" onClick={() => open({ kind: 'category', category })}>
                    Ubah
                  </Button>
                  <Button variant="danger-ghost" onClick={() => open({ kind: 'delete-category', category })}>
                    Hapus
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="judul-menu" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="judul-menu" className="text-lg font-bold text-ink">
            {showArchived ? 'Menu diarsipkan' : 'Menu'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'Kembali ke menu aktif' : 'Lihat arsip'}
            </Button>
            {!showArchived && (
              <Button disabled={categoryList.length === 0} onClick={() => open({ kind: 'item', item: null })}>
                + Menu
              </Button>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-ink sm:max-w-xs">
          Filter kategori
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-11 rounded-xl border-2 border-line bg-surface px-3 text-base font-normal"
          >
            <option value="all">Semua kategori</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {items.isPending ? (
          <p className="p-4 text-muted" aria-busy="true">
            Memuat {showArchived ? 'arsip' : 'menu'}…
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-muted">
            {showArchived ? 'Belum ada menu yang diarsipkan.' : 'Belum ada menu di kategori ini.'}
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visibleItems.map((item) => {
              const soldOutByStock = item.stock === 0;
              return (
                <li key={item.id}>
                  <Card role="article" aria-label={item.name} className="flex h-full flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-sm text-muted">{categoryName.get(item.categoryId) ?? '–'}</p>
                      </div>
                      <p className="font-bold whitespace-nowrap text-primary">{formatRupiah(item.price)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.olseraProductId && <Badge tone="cream">🔄 Tersinkron Olsera</Badge>}
                      {item.isArchived && <Badge>Diarsipkan</Badge>}
                      {!item.isArchived && !item.isAvailable && <Badge tone="danger-solid">Habis</Badge>}
                      {!item.isArchived && item.isAvailable && soldOutByStock && <Badge tone="danger">Stok 0 · tampil Habis</Badge>}
                    </div>
                    <p className="text-sm text-muted">
                      {item.stock === null ? 'Stok tidak dilacak' : `Stok: ${item.stock}`}
                      {item.sku && ` · SKU ${item.sku}`}
                    </p>
                    {!item.isArchived && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-1">
                        <Button
                          role="switch"
                          aria-checked={item.isAvailable}
                          aria-label={`Tersedia: ${item.name}`}
                          variant={item.isAvailable ? 'secondary' : 'danger'}
                          disabled={m.setAvailability.isPending && m.setAvailability.variables?.id === item.id}
                          onClick={() => toggleAvailability(item)}
                          className="min-w-28"
                        >
                          {item.isAvailable ? 'Tersedia' : 'Habis'}
                        </Button>
                        <Button variant="ghost" onClick={() => open({ kind: 'item', item })}>
                          Ubah
                        </Button>
                        <Button variant="danger-ghost" onClick={() => open({ kind: 'archive', item })}>
                          Arsipkan
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
