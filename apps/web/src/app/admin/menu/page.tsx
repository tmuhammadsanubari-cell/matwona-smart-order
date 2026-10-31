'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { MenuAdmin } from '@/components/admin/menu-admin';

// Kelola menu oleh owner (FR-010; task S1-11). Khusus role ADMIN.
export default function AdminMenuPage() {
  return (
    <AdminShell title="Kelola Menu" backHref="/admin">
      {() => <MenuAdmin />}
    </AdminShell>
  );
}
