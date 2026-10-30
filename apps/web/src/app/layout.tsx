import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Fallback untuk font brand Mosvita (belum tersedia). Ganti dengan next/font/local bila file font diterima.
const brandFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Matwona — Tuna & Ayam Kampung',
    template: '%s · Matwona',
  },
  description: 'Two worlds. One table. Simply, makan. Rumah makan spesialis tuna dan ayam kampung di Bandung.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#106f4d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={brandFont.variable}>
      <body>{children}</body>
    </html>
  );
}
