import { TableQrIllustration } from '@/components/order/illustrations';
import { Logo } from '@/components/ui';

// Token QR tidak dikenal atau meja nonaktif (FR-001, desain C7): menu tidak ditampilkan sehingga tidak bisa memesan.
// Tombol "Lihat menu saja" di desain menunggu menu read-only di landing page (S2-06).
export function InvalidQr() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-7 py-12">
      <Logo variant="green" width={150} priority />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <TableQrIllustration />
        <h1 className="text-[26px] leading-tight font-extrabold text-primary">QR tidak dikenali</h1>
        <p className="max-w-[290px] text-[15px] leading-relaxed text-muted">
          Sepertinya QR di meja ini sudah tidak aktif. Silakan hubungi kasir, ya.
        </p>
      </div>
    </main>
  );
}
