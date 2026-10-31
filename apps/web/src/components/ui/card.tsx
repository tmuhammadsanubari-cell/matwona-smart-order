import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `muted` = item tidak tersedia (mis. menu "Habis", FR-002): teks muted, foto grayscale.
   * Sengaja tanpa `opacity` agar teks & badge "Habis" di dalamnya tetap kontras ≥ 4,5:1 (NFR-014).
   */
  muted?: boolean;
}

/** Kartu berlatar putih di atas latar cream; dipakai untuk kartu menu, pesanan, dan ringkasan. */
export function Card({ muted = false, className, ...props }: CardProps) {
  return (
    <div
      aria-disabled={muted || undefined}
      className={cx(
        // Desain: kartu rata dengan border tipis; bayangan (shadow-card) hanya untuk elemen yang melayang.
        'rounded-card border border-line bg-surface p-4',
        muted && 'text-muted [&_img]:grayscale',
        className,
      )}
      {...props}
    />
  );
}
