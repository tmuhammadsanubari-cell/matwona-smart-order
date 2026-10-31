import type { ReactNode } from 'react';
import { cx } from './cx';

/** Banner saat koneksi realtime terputus (kasir & status pesanan). Pemanggil yang menentukan kapan tampil. */
export function ConnectionBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="status"
      className={cx('flex items-center gap-2 bg-warning px-4 py-2.5 text-sm font-bold text-warning-soft', className)}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0"
      >
        <path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2-1.5M12 20h.01" />
      </svg>
      {children}
    </p>
  );
}
