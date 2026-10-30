// Menu digital per meja (FR-001, FR-002; task S1-04).
// TODO: validasi token via GET /public/tables/:token, ambil menu GET /public/outlets/:outlet/menu,
// tab kategori sticky, kartu menu + label Habis, pencarian, carousel "Populer sekarang", keranjang (S1-05).
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ outlet: string; token: string }>;
}) {
  const { outlet } = await params;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-surface">
      <header className="sticky top-0 bg-primary px-4 py-3 text-primary-foreground">
        <p className="text-lg font-bold">Matwona</p>
        <p className="text-sm opacity-90">Outlet: {outlet} · Meja: (menunggu S1-04)</p>
      </header>
      <section className="p-4 text-muted">Menu digital sedang dibangun (S1-04).</section>
    </main>
  );
}
