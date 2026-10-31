'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { TablesAdmin } from '@/components/admin/tables-admin';

// Kelola meja & cetak QR oleh owner (FR-011; task S2-05). Khusus role ADMIN.
export default function AdminTablesPage() {
  return (
    <AdminShell title="Meja & QR">
      {() => <TablesAdmin />}
    </AdminShell>
  );
}
