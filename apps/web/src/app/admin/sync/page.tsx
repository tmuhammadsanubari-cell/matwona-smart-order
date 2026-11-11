'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { OlseraSyncView } from '@/components/admin/olsera-sync';

// Sinkronisasi Olsera (FR-013, FR-014, desain A4). Khusus role ADMIN.
export default function AdminSyncPage() {
  return (
    <AdminShell title="Sinkronisasi Olsera">
      {() => <OlseraSyncView />}
    </AdminShell>
  );
}
