'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { PublicMenu, PublicMenuItem } from 'shared';
import { CartBar } from '@/components/cart/cart-bar';
import { CartSheet } from '@/components/cart/cart-sheet';
import { Button, EmptyState, Logo, toast, Toaster } from '@/components/ui';
import { filterMenu, photoTonesByItem } from '@/lib/menu';
import { activeOrderForTable, type PlacedOrder } from '@/lib/placed-orders';
import { loadCartForTable, summarizeCart, useCart } from '@/stores/cart';
import { CategoryTabs } from './category-tabs';
import { MenuDetailSheet } from './menu-detail-sheet';
import { MenuItemCard } from './menu-item-card';

export interface MenuViewProps {
  token: string;
  tableLabel: string;
  menu: PublicMenu;
}

export const ADDED_TO_CART = 'Ditambahkan ke keranjang';

const sectionId = (categoryId: string) => `kategori-${categoryId}`;

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10h16M6 10v9M18 10v9M8 6h8" />
    </svg>
  );
}

/**
 * Menu digital pelanggan (FR-001…003, desain C1–C3): header logo + meja, pencarian, tab kategori,
 * kartu menu, sheet detail, keranjang.
 */
export function MenuView({ token, tableLabel, menu }: MenuViewProps) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(menu.categories[0]?.id ?? null);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PlacedOrder | undefined>(undefined);
  const [detailItem, setDetailItem] = useState<PublicMenuItem | null>(null);
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);
  const setNote = useCart((s) => s.setNote);

  const categories = useMemo(() => filterMenu(menu.categories, query), [menu.categories, query]);
  const resultCount = categories.reduce((n, c) => n + c.items.length, 0);
  const menuItems = useMemo(
    () => new Map<string, PublicMenuItem>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const))),
    [menu.categories],
  );
  const photoTones = useMemo(() => photoTonesByItem(menu.categories), [menu.categories]);
  const summary = summarizeCart(cartReady ? lines : [], menuItems);

  useEffect(() => {
    let cancelled = false;
    void loadCartForTable(token).then(() => {
      if (cancelled) return;
      // Harga & nama mengikuti menu terbaru; item habis ditandai di keranjang.
      useCart.getState().syncWithMenu(menuItems);
      setActiveOrder(activeOrderForTable(token));
      setCartReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [token, menuItems]);

  // Tab aktif mengikuti kategori yang sedang terlihat di bawah tab sticky.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.getAttribute('data-category-id'));
      },
      { rootMargin: '-72px 0px -60% 0px' },
    );
    for (const category of categories) {
      const el = document.getElementById(sectionId(category.id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories]);

  const quantityOf = (menuItemId: string) =>
    cartReady ? (lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0) : 0;

  const addItem = (item: PublicMenuItem, quantity = 1, note?: string) => {
    add({ menuItemId: item.id, name: item.name, unitPrice: item.price }, quantity);
    if (note !== undefined) setNote(item.id, note);
    toast(ADDED_TO_CART);
  };

  const selectCategory = (id: string) => {
    setActiveId(id);
    document.getElementById(sectionId(id))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <Toaster />
      <header className="flex h-16 items-center justify-between gap-3 bg-primary px-4">
        <Logo priority />
        <h1 className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3.5 py-2 text-sm font-extrabold whitespace-nowrap text-primary">
          <TableIcon />
          Meja {tableLabel}
        </h1>
      </header>

      <div className="flex flex-col gap-3.5 p-4">
        <label className="flex h-12 items-center gap-2.5 rounded-control border-[1.5px] border-line bg-surface px-3.5 focus-within:border-primary">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu..."
            aria-label="Cari menu"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
        </label>

        {activeOrder && (
          <Link
            href={`/m/${menu.outlet.slug}/order/${activeOrder.code}`}
            aria-label={`Ada pesanan aktif ${activeOrder.code}, lihat status`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-primary/25 bg-primary-soft px-3.5 py-3 text-sm font-semibold text-primary-hover"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              Ada pesanan aktif
            </span>
            <span className="font-extrabold whitespace-nowrap">
              Lihat status <span aria-hidden="true">→</span>
            </span>
          </Link>
        )}

        {!query && (
          <>
            {/* Promo Banner mingguan (desain C1) */}
            <div className="flex items-center justify-between gap-3 overflow-hidden rounded-card bg-accent p-4 text-white shadow-xs">
              <div className="flex flex-col gap-1.5">
                <div className="text-[15px] font-extrabold leading-tight">Diskon 10% Paket Tuna setiap Jumat</div>
                <span className="inline-flex self-start rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  Berlaku s.d. 30 Nov 2026
                </span>
              </div>
              <div className="flex size-13 shrink-0 items-center justify-center rounded-full bg-cream text-base font-black text-primary shadow-xs">
                10%
              </div>
            </div>

            {/* Rekomendasi horizontal Populer Sekarang (desain C1) */}
            {menu.categories.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-base font-extrabold text-ink">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#069D70" strokeWidth="2.2" aria-hidden="true">
                      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
                    </svg>
                    <span>Populer sekarang</span>
                  </div>
                  <span className="text-xs font-semibold text-muted">Paling sering dipesan siang ini</span>
                </div>

                <div className="no-scrollbar -mr-4 flex gap-2.5 overflow-x-auto pr-4 pb-1">
                  {menu.categories
                    .flatMap((c) => c.items)
                    .filter((i) => i.isAvailable)
                    .slice(0, 4)
                    .map((popItem) => (
                      <div
                        key={`pop-${popItem.id}`}
                        className="flex w-[140px] shrink-0 flex-col overflow-hidden rounded-control border border-line bg-surface shadow-xs"
                      >
                        <div
                          className="flex h-[80px] w-full cursor-pointer items-center justify-center bg-photo-tuna text-photo-tuna-ink"
                          onClick={() => setDetailItem(popItem)}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                            <circle cx="12" cy="13" r="7" />
                            <path d="M5 13h14" />
                          </svg>
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                          <div
                            className="cursor-pointer text-xs font-extrabold leading-snug line-clamp-2 text-ink hover:text-primary"
                            onClick={() => setDetailItem(popItem)}
                          >
                            {popItem.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <span className="text-xs font-extrabold text-primary">
                              {popItem.price >= 1000 ? `Rp${(popItem.price / 1000).toFixed(0)}rb` : `Rp${popItem.price}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => addItem(popItem)}
                              aria-label={`Tambah cepat ${popItem.name}`}
                              className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white transition hover:bg-primary-hover active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {query ? `${resultCount} menu ditemukan` : ''}
      </p>

      <CategoryTabs
        categories={categories.map(({ id, name }) => ({ id, name }))}
        activeId={categories.some((c) => c.id === activeId) ? activeId : (categories[0]?.id ?? null)}
        onSelect={selectCategory}
      />

      {categories.length === 0 ? (
        <EmptyState
          title={query ? `Menu “${query}” tidak ditemukan` : 'Menu belum tersedia'}
          description={query ? 'Coba kata lain, mis. tuna atau ayam.' : 'Silakan hubungi kasir.'}
          icon={<SearchIcon />}
          action={
            query ? (
              <Button variant="secondary" onClick={() => setQuery('')}>
                Hapus pencarian
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-6 px-4 pt-4">
          {categories.map((category) => (
            <section
              key={category.id}
              id={sectionId(category.id)}
              data-category-id={category.id}
              aria-labelledby={`${sectionId(category.id)}-judul`}
              className="flex scroll-mt-18 flex-col gap-3"
            >
              <h2 id={`${sectionId(category.id)}-judul`} className="text-xl font-extrabold text-primary">
                {category.name}
              </h2>
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  photoTone={photoTones.get(item.id) ?? 'none'}
                  quantity={quantityOf(item.id)}
                  onAdd={() => addItem(item)}
                  onQuantityChange={(qty) => setQuantity(item.id, qty)}
                  onOpenDetail={() => setDetailItem(item)}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {cartReady && lines.length > 0 && (
        <CartBar itemCount={summary.itemCount} total={summary.total} onOpen={() => setCartOpen(true)} />
      )}
      <MenuDetailSheet
        item={detailItem}
        photoTone={detailItem ? (photoTones.get(detailItem.id) ?? 'none') : 'none'}
        existingNote={detailItem ? lines.find((l) => l.menuItemId === detailItem.id)?.note : undefined}
        onClose={() => setDetailItem(null)}
        onAdd={(quantity, note) => {
          if (detailItem) addItem(detailItem, quantity, note);
          setDetailItem(null);
        }}
      />
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        tableLabel={tableLabel}
        menuItems={menuItems}
        photoTones={photoTones}
        checkoutHref={`/m/${menu.outlet.slug}/t/${encodeURIComponent(token)}/checkout`}
      />
    </main>
  );
}
