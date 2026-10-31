import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Masuk staf', robots: { index: false } };

// Login staf (FR-009): kasir & admin. Pelanggan tidak login (CLAUDE.md aturan 9).
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <header className="text-center">
        <p className="text-sm font-semibold text-primary">Matwona Smart Order</p>
        <h1 className="text-2xl font-bold text-ink">Masuk staf</h1>
        <p className="text-sm text-muted">Untuk kasir dan admin outlet.</p>
      </header>
      {/* useSearchParams (?next=) butuh Suspense boundary saat prerender. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
