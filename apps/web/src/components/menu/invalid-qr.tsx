// Token QR tidak dikenal atau meja nonaktif (FR-001): menu tidak ditampilkan sehingga tidak bisa memesan.
export function InvalidQr() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl" aria-hidden="true">
        📵
      </p>
      <h1 className="text-xl font-bold text-ink">QR tidak dikenali, silakan hubungi kasir</h1>
      <p className="text-muted">
        Kode QR di meja ini sudah tidak berlaku. Minta bantuan kasir untuk memesan atau mendapatkan QR yang baru.
      </p>
    </main>
  );
}
