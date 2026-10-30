import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'cream';

/**
 * Setiap tone memakai pasangan teks/latar dengan kontras ≥ 4,5:1 (NFR-014), diuji di contrast.test.ts.
 * `success` sengaja memakai teks primary di latar primary-soft, bukan teks accent (hanya ±3,5:1).
 */
export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-line text-ink',
  primary: 'bg-primary text-cream',
  success: 'bg-primary-soft text-primary',
  danger: 'bg-danger-soft text-danger',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
