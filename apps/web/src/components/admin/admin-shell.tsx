'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AuthUser } from 'shared';
import { useStaffSession } from '@/components/auth/use-staff-session';
import { Button, cx, Logo } from '@/components/ui';

export interface AdminShellProps {
  title: string;
  children: (user: AuthUser) => ReactNode;
}

const ActionsSlot = createContext<HTMLElement | null>(null);

/** Tombol di kanan judul halaman (mis. "+ Tambah Menu"); dirender dari dalam halaman agar bisa memakai state-nya. */
export function AdminActions({ children }: { children: ReactNode }) {
  const slot = useContext(ActionsSlot);
  return slot ? createPortal(children, slot) : null;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Task backlog bila halaman belum dibuat; tampil nonaktif "Segera". */
  task?: string;
}

// Urutan & ikon mengikuti sidebar desain A2/A3. Halaman yang belum ada tampil nonaktif.
export const ADMIN_NAV: NavItem[] = [
  { label: 'Beranda', href: '/admin', icon: 'M3 11l9-7 9 7M5 10v10h14V10' },
  { label: 'Menu', href: '/admin/menu', icon: 'M4 6h16M4 12h16M4 18h10' },
  { label: 'Meja & QR', href: '/admin/tables', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM17 20h4v-3' },
  { label: 'Dashboard Kasir', href: '/cashier', icon: 'M3 11h18v9H3zM6 11V5h8v6M7 15h4' },
  { label: 'Analitik', href: '/admin/analytics', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2', task: 'S3-06' },
  { label: 'Promo', href: '/admin/promos', icon: 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01', task: 'S3-08' },
  {
    label: 'Sinkronisasi Olsera',
    href: '/admin/sync',
    icon: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
    task: 'S2-10',
  },
  { label: 'Rekomendasi AI', href: '/admin/recommendations', icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', task: 'S3-07' },
  {
    label: 'Staf',
    href: '/admin/staff',
    icon: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 20v-1.5a3 3 0 0 0-2.5-3M4 20v-1.5a3 3 0 0 1 2.5-3',
    task: 'S2-12',
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Kerangka halaman owner/admin (FR-009, desain A2/A3): wajib login ADMIN, sidebar navigasi, judul + aksi. */
export function AdminShell({ title, children }: AdminShellProps) {
  const session = useStaffSession(['ADMIN']);
  const pathname = usePathname();
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  if (session.status === 'loading') return <main className="min-h-dvh" aria-busy="true" aria-label={`Memuat ${title}`} />;
  if (session.status === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-ink">Halaman belum bisa dimuat</h1>
        <Button onClick={session.retry}>Coba lagi</Button>
      </main>
    );
  }
  if (session.status === 'forbidden') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-ink">Halaman ini khusus admin/owner.</h1>
      </main>
    );
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href));
  const brand = (
    <div className="flex items-center gap-2.5">
      <Logo width={112} priority />
      <span className="rounded-md border border-cream/50 px-1.5 py-0.5 text-[13px] font-extrabold text-cream">Admin</span>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* Layar lebar: sidebar hijau. */}
      <aside className="hidden w-62 shrink-0 flex-col gap-6 bg-primary px-4 py-6 lg:flex">
        <div className="px-2">{brand}</div>
        <nav aria-label="Navigasi admin" className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) =>
            item.task ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex min-h-11 items-center gap-3 rounded-control px-3.5 text-sm font-semibold text-cream/60"
              >
                <NavIcon d={item.icon} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[11px] font-bold">Segera</span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cx(
                  'flex min-h-11 items-center gap-3 rounded-control px-3.5 text-sm',
                  isActive(item.href) ? 'bg-cream font-extrabold text-primary' : 'font-semibold text-cream hover:bg-cream/10',
                )}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2 rounded-control bg-cream/10 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream font-extrabold text-primary">
              {initials(session.user.name)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-primary-foreground">{session.user.name}</span>
              <span className="text-xs text-cream">Admin</span>
            </div>
          </div>
          <Button variant="inverse" fullWidth onClick={() => void session.logout()}>
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* HP/tablet: bar hijau + navigasi geser. */}
        <header className="bg-primary lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            {brand}
            <Button variant="inverse" onClick={() => void session.logout()}>
              Keluar
            </Button>
          </div>
          <nav aria-label="Navigasi admin (ringkas)" className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {ADMIN_NAV.filter((item) => !item.task).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cx(
                  'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap',
                  isActive(item.href) ? 'bg-cream font-extrabold text-primary' : 'bg-cream/10 font-semibold text-cream',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-24 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-h1 font-extrabold text-primary">{title}</h1>
            <div ref={setActionsSlot} className="flex flex-wrap gap-2.5 empty:hidden" />
          </div>
          <ActionsSlot.Provider value={actionsSlot}>{children(session.user)}</ActionsSlot.Provider>
        </main>
      </div>
    </div>
  );
}
