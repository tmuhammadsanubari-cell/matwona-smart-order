// Skeleton saat data meja & menu dimuat (koneksi 4G lambat). Bentuknya mengikuti layout menu (desain C1).
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md" aria-busy="true" aria-label="Memuat menu">
      <header className="flex h-16 items-center justify-between bg-primary px-4">
        <div className="h-7 w-32 rounded bg-cream/30" />
        <div className="h-9 w-24 rounded-full bg-cream/30" />
      </header>
      <div className="flex flex-col gap-3 p-4">
        <div className="h-12 rounded-control bg-surface" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 w-28 rounded-full bg-line" />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-card border border-line bg-surface p-2.5">
            <div className="h-[72px] w-24 shrink-0 rounded-control bg-line" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-4 w-3/4 rounded bg-line" />
              <div className="h-3 w-1/2 rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
