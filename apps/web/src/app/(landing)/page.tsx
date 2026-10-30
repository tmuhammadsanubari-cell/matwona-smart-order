// Landing page (FR-012, task S2-06). Placeholder: ganti dengan hero, cerita brand,
// menu read-only, promo aktif, lokasi (Google Maps), CTA WhatsApp. Render SSG/ISR (revalidate 300).
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Ma · Two · Na</p>
      <h1 className="text-4xl font-bold text-primary">Matwona</h1>
      <p className="max-w-md text-muted">Two worlds. One table. Simply, makan.</p>
      <p className="rounded-card bg-surface px-4 py-2 text-sm text-muted shadow-sm">
        Landing page sedang dibangun (S2-06)
      </p>
    </main>
  );
}
