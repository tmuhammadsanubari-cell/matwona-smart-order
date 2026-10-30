import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UiPreview } from './ui-preview';

export const metadata: Metadata = { title: 'UI kit', robots: { index: false } };

/** Pratinjau komponen dasar (S0-05) untuk cek manual di lebar 360 px. Tidak tersedia di build produksi. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiPreview />;
}
