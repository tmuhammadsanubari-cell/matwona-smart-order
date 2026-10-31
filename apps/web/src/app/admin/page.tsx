'use client';

import Link from 'next/link';
import { AdminShell } from '@/components/admin/admin-shell';

// Dashboard admin/owner (wajib login ADMIN). Sub-halaman: menu (S1-11), meja (S2-05), sinkronisasi (S2-10),
// analitik (S3-06), rekomendasi (S3-07), promo (S3-08), staf (S2-12).
const sections = [
  { href: '/admin/menu', label: 'Menu', task: null },
  { href: '/cashier', label: 'Dashboard kasir', task: null },
  { href: '/admin/tables', label: 'Meja & QR', task: null },
  { href: '/admin/sync', label: 'Sinkronisasi Olsera', task: 'S2-10' },
  { href: '/admin/analytics', label: 'Analitik', task: 'S3-06' },
  { href: '/admin/recommendations', label: 'Rekomendasi', task: 'S3-07' },
  { href: '/admin/promos', label: 'Promo', task: 'S3-08' },
  { href: '/admin/staff', label: 'Staf', task: 'S2-12' },
];

export default function AdminHomePage() {
  return (
    <AdminShell title="Dashboard Owner">
      {() => (
        <ul className="mx-auto grid max-w-5xl gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block min-h-11 rounded-card border border-line bg-surface p-4 hover:border-accent">
                <span className="font-semibold text-ink">{s.label}</span>
                {s.task && <span className="mt-1 block text-xs text-muted">Segera hadir · {s.task}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
