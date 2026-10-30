'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicMenu } from 'shared';
import { Button } from '@/components/ui';
import { filterMenu } from '@/lib/menu';
import { loadCartForTable, useCart } from '@/stores/cart';
import { CategoryTabs } from './category-tabs';
import { MenuItemCard } from './menu-item-card';

export interface MenuViewProps {
  token: string;
  tableLabel: string;
  outletName: string;
  menu: PublicMenu;
}

const sectionId = (categoryId: string) => `kategori-${categoryId}`;

/** Menu digital pelanggan (FR-001, FR-002): header meja, pencarian, tab kategori, kartu menu. */
export function MenuView({ token, tableLabel, outletName, menu }: MenuViewProps) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(menu.categories[0]?.id ?? null);
  const [cartReady, setCartReady] = useState(false);
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  const categories = useMemo(() => filterMenu(menu.categories, query), [menu.categories, query]);
  const resultCount = categories.reduce((n, c) => n + c.items.length, 0);

  useEffect(() => {
    let cancelled = false;
    void loadCartForTable(token).then(() => !cancelled && setCartReady(true));
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  const selectCategory = (id: string) => {
    setActiveId(id);
    document.getElementById(sectionId(id))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-24">
      <header className="bg-primary px-4 pt-4 pb-5 text-primary-foreground">
        <p className="text-sm text-cream">{outletName}</p>
        <h1 className="text-2xl font-bold">Meja {tableLabel}</h1>
        <div className="mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu, mis. tuna"
            aria-label="Cari menu"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-xl border-2 border-transparent bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        {query ? `${resultCount} menu ditemukan` : ''}
      </p>

      <CategoryTabs
        categories={categories.map(({ id, name }) => ({ id, name }))}
        activeId={categories.some((c) => c.id === activeId) ? activeId : (categories[0]?.id ?? null)}
        onSelect={selectCategory}
      />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-ink">
            {query ? <>Menu &ldquo;{query}&rdquo; tidak ditemukan.</> : 'Menu belum tersedia. Silakan hubungi kasir.'}
          </p>
          {query && (
            <Button variant="secondary" onClick={() => setQuery('')}>
              Hapus pencarian
            </Button>
          )}
        </div>
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
              <h2 id={`${sectionId(category.id)}-judul`} className="text-lg font-bold text-ink">
                {category.name}
              </h2>
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={quantityOf(item.id)}
                  onAdd={() => add({ menuItemId: item.id, name: item.name, unitPrice: item.price })}
                  onQuantityChange={(qty) => setQuantity(item.id, qty)}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
