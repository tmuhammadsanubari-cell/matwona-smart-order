import type { Metadata } from 'next';
import { OrderStatusView } from '@/components/order/order-status-view';

export const metadata: Metadata = { title: 'Status pesanan', robots: { index: false } };

// Status pesanan pelanggan (FR-007; task S1-09). Token meja ada di localStorage perangkat pemesan,
// sehingga data diambil di klien: realtime via room order:<code>, fallback polling 10 detik.
export default async function OrderStatusPage({ params }: { params: Promise<{ outlet: string; code: string }> }) {
  const { outlet, code } = await params;
  return <OrderStatusView outlet={outlet} code={code} />;
}
