import type { ButtonHTMLAttributes, Ref } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover',
  secondary: 'border-2 border-primary bg-surface text-primary hover:bg-primary-soft',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-primary-foreground hover:opacity-90',
};

// Tinggi minimal 44 px (md) / 52 px (lg) agar mudah disentuh (NFR-012).
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-5 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Menampilkan spinner dan menonaktifkan tombol (mis. saat mengirim pesanan). */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
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
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
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
