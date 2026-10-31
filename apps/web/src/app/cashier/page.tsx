import type { Metadata } from 'next';
import { CashierDashboard } from '@/components/cashier/cashier-dashboard';

export const metadata: Metadata = { title: 'Dashboard Kasir', robots: { index: false } };

// Dashboard kasir realtime (FR-008; task S1-10). Hanya role CASHIER/ADMIN; sesi dicek di klien
// karena cookie sesi milik domain API.
export default function CashierPage() {
  return <CashierDashboard />;
}
