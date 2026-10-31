import Image from 'next/image';
import { cx } from './cx';

// Rasio file logo resmi di public/brand (710 × 168 px).
const LOGO_RATIO = 168 / 710;

const SRC = {
  /** Logo terang untuk latar hijau (header). */
  light: '/brand/matwona-logo.png',
  /** Logo hijau untuk latar cream/putih. */
  green: '/brand/matwona-logo-green.png',
} as const;

export interface LogoProps {
  variant?: keyof typeof SRC;
  /** Lebar tampilan dalam px; tinggi mengikuti rasio. */
  width?: number;
  priority?: boolean;
  className?: string;
}

/** Logo resmi Matwona. Jangan diketik ulang dengan font (BRAND.md). */
export function Logo({ variant = 'light', width = 132, priority = false, className }: LogoProps) {
  return (
    <Image
      src={SRC[variant]}
      alt="Matwona"
      width={width}
      height={Math.round(width * LOGO_RATIO)}
      priority={priority}
      className={cx('h-auto', className)}
    />
  );
}
