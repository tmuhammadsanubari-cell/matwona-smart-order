import { Badge, Button, Card, cx, type PhotoTone } from '@/components/ui';
import { groupPriceLabel } from '@/lib/menu-groups';
import type { PublicMenuItem } from 'shared';
import { MenuPhoto } from './menu-item-card';

export interface MenuGroupCardProps {
  name: string;
  description: string | null;
  imageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  items: PublicMenuItem[];
  isAvailable: boolean;
  photoTone: PhotoTone;
  totalInCart: number;
  onSelect: () => void;
}

/**
 * Kartu grup menu (ringkas): menggabungkan beberapa varian rasa/level pedas berharga seragam ke
 * satu kartu agar menu mobile lebih singkat, lalu membuka bottom sheet pemilihan varian saat diklik.
 */
export function MenuGroupCard({
  name,
  description,
  imageUrl,
  minPrice,
  maxPrice,
  items,
  isAvailable,
  photoTone,
  totalInCart,
  onSelect,
}: MenuGroupCardProps) {
  const soldOut = !isAvailable;
  const variantNames = items.map((v) => v.variantLabel?.trim() || v.name).join(' · ');

  return (
    <Card muted={soldOut} padding="sm" className="relative isolate flex gap-3">
      <div className="relative shrink-0">
        <MenuPhoto
          item={{ name, imageUrl }}
          tone={soldOut ? 'none' : photoTone}
          width={96}
          className="h-[72px] w-24 rounded-control"
        />
        {soldOut ? (
          <Badge tone="danger-solid" className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[11px]">
            Habis
          </Badge>
        ) : (
          <Badge tone="primary" className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[10px]">
            {items.length} varian
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-[15px] leading-snug font-extrabold">
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Pilih varian ${name}`}
            className={cx(
              'text-left after:absolute after:inset-0 after:rounded-card focus-visible:outline-none',
              'focus-visible:after:outline-3 focus-visible:after:outline-accent',
              soldOut ? 'text-muted' : 'text-ink',
            )}
          >
            {name}
          </button>
        </h3>
        <p className="truncate text-xs font-semibold text-muted">{variantNames}</p>
        {description && <p className="truncate text-[11px] text-muted">{description}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span
            className={cx(
              'text-[15px] font-extrabold whitespace-nowrap',
              soldOut ? 'text-muted' : 'text-primary',
            )}
          >
            {groupPriceLabel(minPrice, maxPrice)}
          </span>
          <div className="relative z-10">
            {soldOut ? (
              <Button disabled aria-label={`${name} habis`}>
                Habis
              </Button>
            ) : (
              <Button variant={totalInCart > 0 ? 'secondary' : 'primary'} onClick={onSelect}>
                {totalInCart > 0 ? `${totalInCart} dipilih · Ubah` : 'Pilih Varian'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
