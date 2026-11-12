'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { MATWONA_CATALOG, formatRupiah, type CatalogItem } from 'shared';
import { BottomSheet } from '@/components/ui/bottom-sheet';

const PRINTED_MENUS = [
  { title: 'Olahan Tuna & Alacarte', src: '/menu/menu-tuna.webp', width: 1600, height: 1131 },
  {
    title: 'Bakmie, Nasi Telur & Camilan',
    src: '/menu/menu-bakmie.webp',
    width: 1600,
    height: 1131,
  },
  {
    title: 'Signature Coffee, Tea & Minuman',
    src: '/menu/menu-minuman.webp',
    width: 1131,
    height: 1600,
  },
];
const MENU_COUNT = MATWONA_CATALOG.reduce((count, section) => count + section.items.length, 0);

/** Buku menu publik; gaya editorial yang sama, dengan isi dari menu mitra. */
export function LandingMenu() {
  const [query, setQuery] = useState('');
  const [activeItem, setActiveItem] = useState<(CatalogItem & { category: string }) | null>(null);
  const [artwork, setArtwork] = useState<(typeof PRINTED_MENUS)[number] | null>(null);
  const search = query.trim().toLocaleLowerCase('id');
  const sections = MATWONA_CATALOG.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      `${item.name} ${item.description} ${section.name}`.toLocaleLowerCase('id').includes(search),
    ),
  })).filter((section) => section.items.length > 0);
  const resultCount = sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <section id="menu" className="mx-auto max-w-6xl scroll-mt-36 px-4 pt-6 pb-20 sm:px-6 sm:pb-28">
      <div className="rounded-[32px] border-2 border-primary/15 bg-surface p-4 shadow-xl shadow-primary/5 sm:p-10 lg:p-12">
        <div className="flex flex-col justify-between gap-6 border-b border-line pb-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-black tracking-widest text-primary uppercase">
              Buku Menu & Harga
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Sajian Dapur Matwona
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed font-medium text-muted">
              Dua dunia, satu meja. Pilih olahan tuna, ayam kampung, sampai kopi favoritmu.
            </p>
          </div>
          <Link
            href="/m/matwona/t/tok-meja-01"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-3 text-xs font-black text-cream transition hover:bg-primary-hover"
          >
            Buka Menu Meja Digital →
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <label className="flex min-h-12 items-center gap-3 rounded-control border border-line-strong bg-cream/30 px-4 focus-within:border-primary">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-primary"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Cari di buku menu"
              placeholder="Cari tuna, bakmie, kopi..."
              enterKeyHint="search"
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
            />
          </label>
          <nav
            aria-label="Kategori buku menu"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#buku-${section.id}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-primary/20 bg-cream/50 px-4 text-xs font-bold text-primary transition hover:bg-primary-soft"
              >
                {section.name}
              </a>
            ))}
          </nav>
          <p role="status" className="text-xs text-muted">
            {search
              ? `${resultCount} menu ditemukan`
              : `${MENU_COUNT} pilihan untuk menemani makanmu`}{' '}
            · Ketuk menu untuk melihat detail
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-bold text-ink">Menu yang kamu cari belum ditemukan.</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 min-h-11 rounded-control border border-primary px-4 text-sm font-bold text-primary"
            >
              Lihat semua menu
            </button>
          </div>
        ) : (
          <div className="mt-8 grid min-w-0 grid-cols-1 items-start gap-x-14 gap-y-10 lg:grid-cols-2">
            {sections.map((section) => (
              <div key={section.id} id={`buku-${section.id}`} className="min-w-0 scroll-mt-36">
                <div className="flex items-center justify-between gap-3 border-b-2 border-primary pb-2.5">
                  <h3 className="text-lg font-black text-primary">{section.name}</h3>
                  <span className="shrink-0 text-xs font-bold text-muted">
                    {section.items.length} pilihan
                  </span>
                </div>
                {section.items.map((item) => (
                  <button
                    key={item.sku}
                    type="button"
                    onClick={() => setActiveItem({ ...item, category: section.name })}
                    aria-label={`Lihat detail ${item.name}, ${formatRupiah(item.price)}`}
                    className="group flex min-h-16 w-full items-start justify-between gap-3 border-b border-line py-4 text-left transition-colors hover:bg-cream/60"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[15px] leading-snug font-bold text-ink group-hover:text-primary">
                        {item.name}
                      </span>
                      <span className="line-clamp-2 text-xs leading-relaxed text-muted">
                        {item.description}
                      </span>
                      {item.spicy && (
                        <span className="mt-0.5 w-fit rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger-strong">
                          Pedas
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className="font-mono text-sm font-bold whitespace-nowrap text-primary">
                        {formatRupiah(item.price)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-xs font-semibold text-muted group-hover:text-primary"
                      >
                        Detail ↗
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        <details className="mt-10 rounded-2xl border border-line bg-cream/30 px-4">
          <summary className="min-h-12 cursor-pointer py-4 text-sm font-bold text-primary">
            Lihat foto menu asli Matwona
          </summary>
          <p className="pb-4 text-xs leading-relaxed text-muted">
            Menu dan harga di atas mengikuti lembar menu ini. Ketuk gambar untuk melihatnya lebih
            jelas.
          </p>
          <div className="grid gap-4 pb-4 sm:grid-cols-3">
            {PRINTED_MENUS.map((menu) => (
              <button
                key={menu.src}
                type="button"
                aria-label={`Lihat menu asli ${menu.title}`}
                onClick={() => setArtwork(menu)}
                className="overflow-hidden rounded-xl border border-line bg-surface text-left"
              >
                <Image
                  src={menu.src}
                  alt={`Menu asli Matwona: ${menu.title}`}
                  width={menu.width}
                  height={menu.height}
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="aspect-4/3 w-full bg-cream/30 object-contain object-center"
                />
                <span className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-primary">
                  {menu.title}
                  <span aria-hidden="true">↗</span>
                </span>
              </button>
            ))}
          </div>
        </details>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Harga dalam rupiah. Ketersediaan dan harga saat memesan mengikuti menu meja digital.
        </p>
      </div>

      <BottomSheet
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        title={activeItem?.name ?? 'Detail menu'}
        footer={
          <Link
            href="/m/matwona/t/tok-meja-01"
            className="flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-bold text-cream hover:bg-primary-hover"
          >
            Buka Menu Meja Digital →
          </Link>
        }
      >
        {activeItem && (
          <div className="flex flex-col gap-4 pb-2">
            {activeItem.imageUrl && (
              <Image
                src={activeItem.imageUrl}
                alt={activeItem.name}
                width={640}
                height={480}
                sizes="(max-width: 448px) 100vw, 416px"
                className="h-72 w-full rounded-2xl bg-cream/30 object-contain object-center sm:h-80"
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-primary">{activeItem.category}</span>
              <span className="text-xl font-extrabold text-primary">
                {formatRupiah(activeItem.price)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">{activeItem.description}</p>
            {activeItem.spicy && (
              <span className="w-fit rounded-full bg-danger-soft px-3 py-1 text-xs font-bold text-danger-strong">
                Pilihan pedas
              </span>
            )}
          </div>
        )}
      </BottomSheet>
      <BottomSheet
        open={artwork !== null}
        onClose={() => setArtwork(null)}
        title={artwork?.title ?? 'Menu asli'}
        footer={
          artwork && (
            <a
              href={artwork.src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-bold text-cream"
            >
              Buka gambar penuh untuk memperbesar ↗
            </a>
          )
        }
      >
        {artwork && (
          <Image
            src={artwork.src}
            alt={`Menu asli Matwona: ${artwork.title}`}
            width={artwork.width}
            height={artwork.height}
            sizes="(max-width: 448px) 100vw, 416px"
            className="h-auto w-full rounded-control"
          />
        )}
      </BottomSheet>
    </section>
  );
}
