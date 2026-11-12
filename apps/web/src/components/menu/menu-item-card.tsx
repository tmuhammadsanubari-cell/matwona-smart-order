import Image from 'next/image';
import { formatRupiah } from 'shared';
import type { PublicMenuItem } from 'shared';
import {
  Badge,
  Button,
  Card,
  cx,
  PhotoPlaceholder,
  QuantityStepper,
  type PhotoTone,
} from '@/components/ui';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';
import { MAX_QTY_PER_LINE } from '@/stores/cart';

export interface MenuItemCardProps {
  item: PublicMenuItem;
  /** Warna placeholder bila item belum punya foto. */
  photoTone: PhotoTone;
  /** Jumlah di keranjang; 0 = tampilkan tombol "Tambah". */
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
  /** Buka sheet detail (foto besar, deskripsi, catatan). */
  onOpenDetail: () => void;
}

/** Foto ditampilkan utuh di dalam bingkai; dipakai juga di detail, keranjang, dan admin. */
export function MenuPhoto({
  item,
  tone,
  width,
  className,
}: {
  item: Pick<PublicMenuItem, 'name' | 'imageUrl'>;
  tone: PhotoTone;
  width: number;
  className?: string;
}) {
  if (!item.imageUrl) return <PhotoPlaceholder tone={tone} className={className} />;
  return (
    <Image
      src={item.imageUrl}
      loader={
        item.imageUrl.startsWith('https://res.cloudinary.com/') ? cloudinaryLoader : undefined
      }
      alt={item.name}
      width={width}
      height={Math.round((width * 3) / 4)}
      sizes={`${width}px`}
      className={cx('bg-cream/30 object-contain object-center', className)}
    />
  );
}

/**
 * Kartu menu (FR-002, desain C1): foto kiri, nama, deskripsi satu baris, harga, tombol "+ Tambah".
 * Seluruh kartu membuka detail lewat tombol nama yang direntangkan (after:inset-0); tombol aksi di atasnya.
 * Item habis: foto abu-abu, label "Habis", tombol nonaktif.
 */
export function MenuItemCard({
  item,
  photoTone,
  quantity,
  onAdd,
  onQuantityChange,
  onOpenDetail,
}: MenuItemCardProps) {
  const soldOut = !item.isAvailable;
  return (
    // isolate: z-index di dalam kartu (tombol aksi z-10) tidak bersaing dengan tab kategori sticky (z-10)
    // sehingga kartu tidak menutupi tab saat di-scroll.
    <Card muted={soldOut} padding="sm" className="relative isolate flex gap-3">
      <div className="relative shrink-0">
        <MenuPhoto
          item={item}
          tone={soldOut ? 'none' : photoTone}
          width={96}
          className="h-[72px] w-24 rounded-control"
        />
        {soldOut && (
          <Badge tone="danger-solid" className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[11px]">
            Habis
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-[15px] leading-snug font-extrabold">
          <button
            type="button"
            onClick={onOpenDetail}
            aria-label={`Lihat detail ${item.name}`}
            className={cx(
              'text-left after:absolute after:inset-0 after:rounded-card focus-visible:outline-none',
              'focus-visible:after:outline-3 focus-visible:after:outline-accent',
              soldOut ? 'text-muted' : 'text-ink',
            )}
          >
            {item.name}
          </button>
        </h3>
        {item.description && <p className="truncate text-xs text-muted">{item.description}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span
            className={cx(
              'text-[15px] font-extrabold whitespace-nowrap',
              soldOut ? 'text-muted' : 'text-primary',
            )}
          >
            {formatRupiah(item.price)}
          </span>
          {/* relative z-10: di atas tombol detail yang direntangkan. */}
          <div className="relative z-10">
            {soldOut ? (
              <Button disabled aria-label={`${item.name} habis`}>
                Habis
              </Button>
            ) : quantity === 0 ? (
              <Button onClick={onAdd} aria-label={`Tambah ${item.name}`}>
                + Tambah
              </Button>
            ) : (
              <QuantityStepper
                itemName={item.name}
                quantity={quantity}
                max={MAX_QTY_PER_LINE}
                onChange={onQuantityChange}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
