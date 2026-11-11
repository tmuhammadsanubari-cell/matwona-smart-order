'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { PromosAdmin } from '@/components/admin/promos-admin';

export default function AdminPromosPage() {
  return (
    <AdminShell title="Kelola Promo">
      {() => <PromosAdmin />}
    </AdminShell>
  );
}
