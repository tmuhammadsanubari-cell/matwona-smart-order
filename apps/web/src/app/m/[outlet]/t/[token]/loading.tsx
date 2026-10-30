// Skeleton saat data meja & menu dimuat (koneksi 4G lambat).
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md" aria-busy="true" aria-label="Memuat menu">
      <header className="bg-primary px-4 pt-4 pb-5 text-primary-foreground">
        <div className="h-5 w-24 rounded bg-cream/30" />
        <div className="mt-2 h-7 w-32 rounded bg-cream/30" />
      </header>
      <div className="flex flex-col gap-3 p-4">
        <div className="h-12 rounded-xl bg-line" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 w-28 rounded-full bg-line" />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-card bg-surface" />
        ))}
      </div>
    </main>
  );
}
