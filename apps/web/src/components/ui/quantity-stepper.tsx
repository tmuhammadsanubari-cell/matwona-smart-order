export interface QuantityStepperProps {
  /** Nama item untuk label aksesibilitas, mis. "Kurangi Tuna Sambal Matah". */
  itemName: string;
  quantity: number;
  /** Batas atas jumlah; tombol + nonaktif saat tercapai. */
  max: number;
  /** 0 = hapus dari keranjang. */
  onChange: (quantity: number) => void;
}

const STEP_BUTTON =
  'inline-flex h-11 w-12 items-center justify-center text-2xl leading-none font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-neutral';

/** Tombol − jumlah + dalam satu bingkai (FR-003). Mengurangi dari 1 menghapus item. */
export function QuantityStepper({ itemName, quantity, max, onChange }: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={`Jumlah ${itemName}`}
      className="inline-flex shrink-0 items-center self-start overflow-hidden rounded-control border-[1.5px] border-line-strong bg-surface"
    >
      <button
        type="button"
        aria-label={quantity === 1 ? `Hapus ${itemName}` : `Kurangi ${itemName}`}
        onClick={() => onChange(quantity - 1)}
        className={`${STEP_BUTTON} bg-surface text-primary hover:bg-primary-soft`}
      >
        −
      </button>
      <span className="w-10 text-center text-base font-extrabold text-ink" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`Tambah satu ${itemName}`}
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className={`${STEP_BUTTON} bg-primary text-primary-foreground hover:bg-primary-hover`}
      >
        +
      </button>
    </div>
  );
}
