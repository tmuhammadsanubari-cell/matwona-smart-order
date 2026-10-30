import Image from 'next/image';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import { Badge, Button, Card } from '@/components/ui';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';
import { QuantityStepper } from './quantity-stepper';

export interface MenuItemCardProps {
  item: PublicMenuItem;
  /** Jumlah di keranjang; 0 = tampilkan tombol "Tambah". */
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
}

/** Kartu menu (FR-002): item habis tampil abu-abu dengan label "Habis" dan tombol nonaktif. */
export function MenuItemCard({ item, quantity, onAdd, onQuantityChange }: MenuItemCardProps) {
  const soldOut = !item.isAvailable;
  return (
    <Card muted={soldOut} className="flex gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-semibold text-ink">{item.name}</h3>
        {item.description && <p className="line-clamp-2 text-sm text-muted">{item.description}</p>}
        <p className="mt-auto font-bold text-primary">{formatRupiah(item.price)}</p>
        {soldOut && (
          <Badge tone="danger" className="self-start">
            Habis
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            loader={cloudinaryLoader}
            alt={item.name}
            width={96}
            height={72}
            sizes="96px"
            className="h-18 w-24 rounded-xl object-cover"
          />
        )}
        {soldOut ? (
          <Button disabled aria-label={`${item.name} habis`}>
            Tambah
          </Button>
        ) : quantity === 0 ? (
          <Button onClick={onAdd} aria-label={`Tambah ${item.name}`}>
            Tambah
          </Button>
        ) : (
          <QuantityStepper itemName={item.name} quantity={quantity} onChange={onQuantityChange} />
        )}
      </div>
    </Card>
  );
}
