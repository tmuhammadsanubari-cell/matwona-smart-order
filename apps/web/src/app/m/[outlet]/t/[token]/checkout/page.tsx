import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutView } from '@/components/checkout/checkout-view';
import { InvalidQr } from '@/components/menu/invalid-qr';
import { loadTableMenu } from '../load-table-menu';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

// Checkout tamu (FR-004, FR-006; task S1-09). Token meja divalidasi ulang dan menu terbaru dimuat
// agar ringkasan memakai harga & ketersediaan terkini; server tetap menghitung ulang saat kirim (NFR-007).
export default async function CheckoutPage({ params }: { params: Promise<{ outlet: string; token: string }> }) {
  const { outlet, token } = await params;
  const result = await loadTableMenu(outlet, token);

  if (result.kind === 'invalid-token') return <InvalidQr />;
  if (result.kind === 'wrong-outlet') redirect(`/m/${result.slug}/t/${encodeURIComponent(token)}/checkout`);

  return <CheckoutView token={token} outletSlug={result.outlet.slug} tableLabel={result.table.label} menu={result.menu} />;
}
