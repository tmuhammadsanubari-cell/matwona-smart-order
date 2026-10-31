export interface QuantityStepperProps {
  /** Nama item untuk label aksesibilitas, mis. "Kurangi Tuna Sambal Matah". */
  itemName: string;
  quantity: number;
  /** Batas atas jumlah; tombol + nonaktif saat tercapai. */
  max: number;
  /**
   * Batas bawah. 0 (default, keranjang) = mengurangi dari 1 menghapus item ("Hapus …").
   * ≥ 1 (mis. sheet detail menu) = tombol − nonaktif saat tercapai.
   */
  min?: number;
  /** 0 = hapus dari keranjang. */
  onChange: (quantity: number) => void;
}

const STEP_BUTTON =
  'inline-flex h-11 w-12 items-center justify-center text-2xl leading-none font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-neutral';

/** Tombol − jumlah + dalam satu bingkai (FR-003). */
export function QuantityStepper({ itemName, quantity, max, min = 0, onChange }: QuantityStepperProps) {
  const removes = min === 0 && quantity === 1;
  return (
    <div
      role="group"
      aria-label={`Jumlah ${itemName}`}
      className="inline-flex shrink-0 items-center overflow-hidden rounded-control border-[1.5px] border-line-strong bg-surface"
    >
      <button
        type="button"
        aria-label={removes ? `Hapus ${itemName}` : `Kurangi ${itemName}`}
        disabled={min > 0 && quantity <= min}
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
