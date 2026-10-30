// Status pesanan pelanggan (FR-007; task S1-09). Realtime via room order:<code>, fallback polling 10 detik.
export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ outlet: string; code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-4">
      <h1 className="text-xl font-bold text-primary">Pesanan {code}</h1>
      <p className="mt-2 text-muted">Halaman status sedang dibangun (S1-09).</p>
    </main>
  );
}
