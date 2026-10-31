import type { ButtonHTMLAttributes, Ref } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'inverse';
export type ButtonSize = 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover',
  secondary: 'border-[1.5px] border-primary bg-cream text-primary hover:bg-primary-soft',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-primary-foreground hover:opacity-90',
  'danger-ghost': 'bg-transparent text-danger hover:bg-danger-soft',
  // Untuk latar hijau gelap (header): jangan menimpa warna varian lain lewat className, urutan CSS Tailwind tidak dijamin.
  inverse: 'border-[1.5px] border-cream bg-transparent text-cream hover:bg-primary-hover',
};

// Tinggi minimal 44 px (md) / 48 px (lg) agar mudah disentuh (NFR-012).
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Menampilkan spinner dan menonaktifkan tombol (mis. saat mengirim pesanan). */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Kelas Button untuk elemen lain yang harus tampil sebagai tombol, mis. `<Link>` navigasi. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'loading' | 'className'> = {}) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-control font-bold transition-colors',
    VARIANTS[variant],
    // Disabled: latar abu-abu solid (bukan opacity) agar teks tetap kontras ≥ 4,5:1, mis. tombol "Habis".
    // Loading tetap berwarna varian (hanya sedikit pudar) agar tidak terlihat seperti tombol mati.
    loading
      ? 'cursor-wait opacity-85'
      : 'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-neutral',
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, fullWidth, loading, className })}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
