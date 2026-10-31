import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'danger-solid'
  | 'cream';

/**
 * Setiap tone memakai pasangan teks/latar dengan kontras ≥ 4,5:1 (NFR-014), diuji di contrast.test.ts.
 * Pemetaan status pesanan/bayar → tone ada di src/lib/status-tone.ts.
 */
export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  primary: 'bg-primary text-primary-foreground',
  // Teks primary-hover, bukan success/accent (hanya ±3,5:1).
  success: 'bg-success-soft text-primary-hover',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger-strong',
  // Label "Habis" (FR-002).
  'danger-solid': 'bg-danger text-primary-foreground',
  cream: 'border border-primary bg-cream text-primary',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Label kecil: status pesanan/bayar, "Habis", promo. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
