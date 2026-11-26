'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { OlseraTestView } from '@/components/admin/olsera-test-view';

export default function AdminOlseraTestPage() {
  return (
    <AdminShell title="Uji API Olsera (Read-Only)">
      {() => <OlseraTestView />}
    </AdminShell>
  );
}
