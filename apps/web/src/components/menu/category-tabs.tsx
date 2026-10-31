'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/components/ui';

export interface CategoryTabsProps {
  categories: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Tab kategori sticky yang bisa digeser horizontal (FR-002). Tab aktif mengikuti posisi scroll. */
export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Pastikan tab aktif terlihat saat daftar tab lebih lebar dari layar.
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    const list = listRef.current;
    if (!active || !list) return;
    list.scrollTo?.({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [activeId]);

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Kategori menu" className="sticky top-0 z-10 border-b border-line bg-cream/95 shadow-[0_6px_12px_-10px_rgb(16_111_77/0.35)] backdrop-blur">
      <div ref={listRef} className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              aria-current={active || undefined}
              onClick={() => onSelect(category.id)}
              className={cx(
                'min-h-11 shrink-0 rounded-full px-4 text-sm font-bold whitespace-nowrap transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'border border-line bg-surface text-ink',
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
