import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Logo, PhotoPlaceholder } from '@/components/ui';

export const metadata: Metadata = { title: 'Masuk staf', robots: { index: false } };

// Login staf (FR-009, desain K1): panel brand hijau di kiri (layar lebar), form di kanan.
// Pelanggan tidak login (CLAUDE.md aturan 9).
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex flex-col justify-between gap-6 bg-primary px-6 py-6 lg:w-1/2 lg:p-16">
        <Logo width={160} priority className="lg:w-55" />
        <div className="hidden flex-col gap-6 lg:flex">
          <PhotoPlaceholder tone="tuna" className="h-75 rounded-[24px]" />
          <p className="text-[30px] leading-tight font-extrabold text-cream">
            Two worlds. One table.
            <br />
            Simply, makan.
          </p>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-8 lg:w-1/2">
        <div className="w-full max-w-[420px]">
          {/* useSearchParams (?next=) butuh Suspense boundary saat prerender. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
