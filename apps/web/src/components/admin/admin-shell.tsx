'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AuthUser } from 'shared';
import { useStaffSession } from '@/components/auth/use-staff-session';
import { Button } from '@/components/ui';

export interface AdminShellProps {
  title: string;
  /** Tautan kembali (mis. ke /admin); kosong di halaman utama admin. */
  backHref?: string;
  children: (user: AuthUser) => ReactNode;
}

/** Kerangka halaman owner/admin (FR-009): wajib login ADMIN, header judul + kembali + keluar. */
export function AdminShell({ title, backHref, children }: AdminShellProps) {
  const session = useStaffSession(['ADMIN']);

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

  return (
    <main className="min-h-dvh pb-24">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <div>
          {backHref && (
            <Link href={backHref} className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm text-cream">
              ← Dashboard owner
            </Link>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-cream">{session.user.name}</p>
        </div>
        <Button variant="inverse" onClick={() => void session.logout()}>
          Keluar
        </Button>
      </header>
      {children(session.user)}
    </main>
  );
}
