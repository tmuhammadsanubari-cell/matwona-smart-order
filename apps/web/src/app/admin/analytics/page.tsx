'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { AnalyticsAdmin } from '@/components/admin/analytics-admin';

export default function AdminAnalyticsPage() {
  return (
    <AdminShell title="Analitik Penjualan">
      {() => <AnalyticsAdmin />}
    </AdminShell>
  );
}
