import { formatRupiah } from 'shared';
import { Button } from '@/components/ui';

export interface CartBarProps {
  itemCount: number;
  total: number;
  onOpen: () => void;
}

/** Bar keranjang di bawah layar: jumlah item & total selalu terlihat saat keranjang berisi (PRD 4.9). */
export function CartBar({ itemCount, total, onOpen }: CartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface shadow-[0_-4px_16px_rgb(0_0_0/0.08)]">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="text-sm text-muted">{itemCount} item</p>
          <p className="text-lg font-bold text-ink">{formatRupiah(total)}</p>
        </div>
        <Button size="lg" onClick={onOpen}>
          Lihat keranjang
        </Button>
      </div>
    </div>
  );
}
