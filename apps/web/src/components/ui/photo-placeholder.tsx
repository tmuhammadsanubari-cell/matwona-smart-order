import { cx } from './cx';

export type PhotoTone = 'tuna' | 'chicken' | 'drink' | 'none';

const TONES: Record<PhotoTone, string> = {
  tuna: 'bg-photo-tuna text-photo-tuna-ink',
  chicken: 'bg-photo-chicken text-photo-chicken-ink',
  drink: 'bg-photo-drink text-photo-drink-ink',
  none: 'bg-photo-none text-photo-none-ink',
};

/** Pengganti foto menu yang belum diunggah: latar sesuai jenis menu + ikon piring dekoratif. Ukuran dari className. */
export function PhotoPlaceholder({ tone = 'none', className }: { tone?: PhotoTone; className?: string }) {
  return (
    <div aria-hidden="true" className={cx('flex items-center justify-center', TONES[tone], className)}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="13" r="7" />
        <path d="M5 13h14" />
      </svg>
    </div>
  );
}
