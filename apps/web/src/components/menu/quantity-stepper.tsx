import { Button } from '@/components/ui';
import { MAX_QTY_PER_LINE } from '@/stores/cart';

export interface QuantityStepperProps {
  /** Nama item untuk label aksesibilitas, mis. "Kurangi Tuna Sambal Matah". */
  itemName: string;
  quantity: number;
  /** 0 = hapus dari keranjang. */
  onChange: (quantity: number) => void;
}

/** Tombol − jumlah + (1–20 per baris, FR-003). Mengurangi dari 1 menghapus item. */
export function QuantityStepper({ itemName, quantity, onChange }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Jumlah ${itemName}`}>
      <Button
        variant="secondary"
        className="w-11 px-0 text-xl"
        aria-label={quantity === 1 ? `Hapus ${itemName}` : `Kurangi ${itemName}`}
        onClick={() => onChange(quantity - 1)}
      >
        −
      </Button>
      <span className="w-7 text-center font-bold" aria-live="polite">
        {quantity}
      </span>
      <Button
        className="w-11 px-0 text-xl"
        aria-label={`Tambah satu ${itemName}`}
        disabled={quantity >= MAX_QTY_PER_LINE}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
  );
}
