'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { RecommendationsAdmin } from '@/components/admin/recommendations-admin';

export default function AdminRecommendationsPage() {
  return (
    <AdminShell title="Rekomendasi AI">
      {() => <RecommendationsAdmin />}
    </AdminShell>
  );
}
