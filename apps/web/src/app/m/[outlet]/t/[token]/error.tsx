'use client';

import { Button } from '@/components/ui';

// API tidak bisa dihubungi / error tak terduga saat memuat menu.
export default function MenuError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl" aria-hidden="true">
        🍽️
      </p>
      <h1 className="text-xl font-bold text-ink">Menu belum bisa dimuat</h1>
      <p className="text-muted">Periksa koneksi internetmu, lalu coba lagi. Jika masih gagal, silakan hubungi kasir.</p>
      <Button size="lg" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  );
}
