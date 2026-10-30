import Link from 'next/link';

// Dashboard admin/owner. Sub-halaman: menu (S1-11), meja (S2-05), sinkronisasi (S2-10),
// analitik (S3-06), rekomendasi (S3-07), promo (S3-08), staf (S2-12).
const sections = [
  { href: '/admin/menu', label: 'Menu', task: 'S1-11' },
  { href: '/admin/tables', label: 'Meja & QR', task: 'S2-05' },
  { href: '/admin/sync', label: 'Sinkronisasi Olsera', task: 'S2-10' },
  { href: '/admin/analytics', label: 'Analitik', task: 'S3-06' },
  { href: '/admin/recommendations', label: 'Rekomendasi', task: 'S3-07' },
  { href: '/admin/promos', label: 'Promo', task: 'S3-08' },
  { href: '/admin/staff', label: 'Staf', task: 'S2-12' },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-dvh p-6">
      <h1 className="text-2xl font-bold text-primary">Dashboard Owner</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-card border border-line bg-surface p-4 hover:border-accent"
            >
              <span className="font-semibold text-ink">{s.label}</span>
              <span className="mt-1 block text-xs text-muted">Task {s.task}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
