import { cx } from './cx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nama untuk pembaca layar, mis. "Tersedia: Tuna Sambal Matah". */
  'aria-label': string;
  disabled?: boolean;
  className?: string;
}

/**
 * Sakelar on/off (desain A2/A3): jalur 42 × 24 px di dalam area sentuh 44 px (NFR-012).
 * Hijau = aktif/tersedia, abu-abu = nonaktif/habis.
 */
export function Switch({ checked, onChange, disabled, className, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'group inline-flex size-11 shrink-0 items-center justify-center rounded-control disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cx(
          'relative h-6 w-[42px] rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] size-[18px] rounded-full bg-surface shadow-sm transition-[left]',
            checked ? 'left-[21px]' : 'left-[3px]',
          )}
        />
      </span>
    </button>
  );
}
