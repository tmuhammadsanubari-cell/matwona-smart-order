import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type CardPadding = 'none' | 'sm' | 'md';

// Padding lewat prop, bukan menimpa `p-4` dengan className: dua kelas padding yang sama-sama
// di className tidak menjamin mana yang menang (urutan CSS Tailwind).
const PADDING: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-2.5',
  md: 'p-4',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `muted` = item tidak tersedia (mis. menu "Habis", FR-002): teks muted, foto grayscale.
   * Sengaja tanpa `opacity` agar teks & badge "Habis" di dalamnya tetap kontras ≥ 4,5:1 (NFR-014).
   */
  muted?: boolean;
  /** `sm` = kartu menu (10 px), `none` = daftar berbaris di dalam kartu. Default `md` (16 px). */
  padding?: CardPadding;
}

/** Kartu berlatar putih di atas latar cream; dipakai untuk kartu menu, pesanan, dan ringkasan. */
export function Card({ muted = false, padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      aria-disabled={muted || undefined}
      className={cx(
        // Desain: kartu rata dengan border tipis; bayangan (shadow-card) hanya untuk elemen yang melayang.
        'rounded-card border border-line bg-surface',
        PADDING[padding],
        muted && 'text-muted [&_img]:grayscale',
        className,
      )}
      {...props}
    />
  );
}
