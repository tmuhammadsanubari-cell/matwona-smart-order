import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

// Checkout tamu (FR-004, FR-006; task S1-09): nama, no. HP opsional, metode bayar, kirim pesanan.
// TODO(S1-09): form createOrderSchema → POST /public/orders (Idempotency-Key), tangani ITEM_UNAVAILABLE /
// PRICE_CHANGED / DUPLICATE_REQUEST, lalu arahkan ke /m/[outlet]/order/[code].
export default async function CheckoutPage({ params }: { params: Promise<{ outlet: string; token: string }> }) {
  const { outlet, token } = await params;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-primary">Checkout</h1>
      <p className="text-muted">Halaman checkout sedang dibangun (S1-09).</p>
      <Link href={`/m/${outlet}/t/${token}`} className={buttonClassName({ variant: 'secondary' })}>
        Kembali ke menu
      </Link>
    </main>
  );
}
