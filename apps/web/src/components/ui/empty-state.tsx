import type { ReactNode } from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Ikon dekoratif; default ikon keranjang. */
  icon?: ReactNode;
  /** Aksi lanjutan, mis. tautan "Lihat menu". */
  action?: ReactNode;
  className?: string;
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="text-accent"
    >
      <path d="M3 4h2l2.4 11h11L21 7H6.2" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}

/** Keadaan kosong, mis. "Keranjangmu masih kosong" atau hasil pencarian tidak ditemukan. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-2.5 px-5 py-8 text-center', className)}>
      {icon ?? <CartIcon />}
      <p className="font-extrabold text-ink">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
