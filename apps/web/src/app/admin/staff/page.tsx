'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { StaffAdmin } from '@/components/admin/staff-admin';

export default function AdminStaffPage() {
  return (
    <AdminShell title="Kelola Staf">
      {() => <StaffAdmin />}
    </AdminShell>
  );
}
