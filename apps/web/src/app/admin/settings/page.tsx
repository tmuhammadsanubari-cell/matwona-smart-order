'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { OutletSettingsAdmin } from '@/components/admin/outlet-settings-admin';

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Pengaturan Outlet">
      {() => <OutletSettingsAdmin />}
    </AdminShell>
  );
}
