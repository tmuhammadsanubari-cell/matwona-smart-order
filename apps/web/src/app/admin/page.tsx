'use client';

import Link from 'next/link';
import { ADMIN_NAV, AdminShell } from '@/components/admin/admin-shell';

// Dashboard admin/owner (wajib login ADMIN). Daftar halaman sama dengan sidebar (ADMIN_NAV); halaman yang
// belum dibuat tampil "Segera hadir" dengan ID task backlog.
export default function AdminHomePage() {
  return (
    <AdminShell title="Dashboard Owner">
      {() => (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_NAV.filter((s) => s.href !== '/admin').map((s) => (
            <li key={s.href}>
              {s.task ? (
                <div aria-disabled="true" className="flex min-h-11 flex-col rounded-card border border-dashed border-line-strong p-4">
                  <span className="font-bold text-muted">{s.label}</span>
                  <span className="mt-1 text-xs text-muted">Segera hadir · {s.task}</span>
                </div>
              ) : (
                <Link
                  href={s.href}
                  className="flex min-h-11 flex-col rounded-card border border-line bg-surface p-4 font-bold text-ink hover:border-primary"
                >
                  {s.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
