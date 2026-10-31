import { formatRupiah } from 'shared';

export interface CartBarProps {
  itemCount: number;
  total: number;
  onOpen: () => void;
}

/** Bar keranjang melayang di bawah layar (desain C1): jumlah item & total selalu terlihat (PRD 4.9). */
export function CartBar({ itemCount, total, onOpen }: CartBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Lihat keranjang, ${itemCount} item, total ${formatRupiah(total)}`}
        className="pointer-events-auto mx-auto flex h-15 w-full max-w-md items-center justify-between gap-3 rounded-card bg-primary px-4 text-primary-foreground shadow-float transition-colors hover:bg-primary-hover"
      >
        <span className="rounded-full bg-cream px-2.5 py-0.5 text-[13px] font-extrabold whitespace-nowrap text-primary">
          {itemCount} item
        </span>
        <span className="flex items-center gap-3 text-[15px]">
          <span className="font-extrabold whitespace-nowrap">{formatRupiah(total)}</span>
          <span className="font-bold whitespace-nowrap">
            Lihat Keranjang <span aria-hidden="true">→</span>
          </span>
        </span>
      </button>
    </div>
  );
}
