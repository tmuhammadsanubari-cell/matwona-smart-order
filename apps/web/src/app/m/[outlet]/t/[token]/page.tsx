import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InvalidQr } from '@/components/menu/invalid-qr';
import { MenuView } from '@/components/menu/menu-view';
import { loadTableMenu } from './load-table-menu';

export const metadata: Metadata = { title: 'Menu', robots: { index: false } };

// Menu digital per meja (FR-001, FR-002; task S1-04). Data diambil di server agar LCP cepat (NFR-001).
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ outlet: string; token: string }>;
}) {
  const { outlet, token } = await params;
  const result = await loadTableMenu(outlet, token);

  if (result.kind === 'invalid-token') return <InvalidQr />;
  if (result.kind === 'wrong-outlet') redirect(`/m/${result.slug}/t/${encodeURIComponent(token)}`);

  return <MenuView token={token} tableLabel={result.table.label} menu={result.menu} />;
}
