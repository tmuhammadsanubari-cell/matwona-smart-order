'use client';

import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
  lastLogin: string;
}

const INITIAL_STAFF: StaffUser[] = [
  { id: 'u1', name: 'Owner Matwona', email: 'owner@matwona.local', role: 'ADMIN', isActive: true, lastLogin: '11 Nov 09:15' },
  { id: 'u2', name: 'Admin Kantor', email: 'admin@matwona.local', role: 'ADMIN', isActive: true, lastLogin: '10 Nov 18:42' },
  { id: 'u3', name: 'Kasir Siang', email: 'kasir.siang@matwona.local', role: 'CASHIER', isActive: true, lastLogin: '11 Nov 10:01' },
  { id: 'u4', name: 'Kasir Malam', email: 'kasir.malam@matwona.local', role: 'CASHIER', isActive: true, lastLogin: '10 Nov 20:30' },
  { id: 'u5', name: 'Kasir Cadangan', email: 'kasir.lama@matwona.local', role: 'CASHIER', isActive: false, lastLogin: '15 Okt 09:22' },
];

export function StaffAdmin() {
  const [staff, setStaff] = useState<StaffUser[]>(INITIAL_STAFF);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');

  const toggleStatus = (id: string) => {
    setStaff((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    );
  };

  const handleAddStaff = () => {
    if (!name.trim() || !email.trim()) return;
    const newStaff: StaffUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      role,
      isActive: true,
      lastLogin: 'Belum login',
    };
    setStaff([...staff, newStaff]);
    setName('');
    setEmail('');
    setShowModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">
          Manajemen akun kasir dan administrator outlet Matwona.
        </p>
        <Button onClick={() => setShowModal(true)}>+ Tambah Staf Baru</Button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Total Staf</span>
          <span className="text-2xl font-black text-ink">{staff.length}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Admin</span>
          <span className="text-2xl font-black text-primary">
            {staff.filter((s) => s.role === 'ADMIN').length}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">Kasir</span>
          <span className="text-2xl font-black text-accent">
            {staff.filter((s) => s.role === 'CASHIER').length}
          </span>
        </Card>
      </div>

      {/* Staff Table */}
      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-neutral-soft/50 text-xs font-bold text-muted">
            <tr>
              <th className="p-4">Nama</th>
              <th className="p-4">Email</th>
              <th className="p-4">Peran</th>
              <th className="p-4">Status</th>
              <th className="p-4">Login Terakhir</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((u) => (
              <tr key={u.id} className="hover:bg-primary-soft/20">
                <td className="p-4 font-bold text-ink">{u.name}</td>
                <td className="p-4 text-xs text-muted">{u.email}</td>
                <td className="p-4">
                  <Badge tone={u.role === 'ADMIN' ? 'primary' : 'info'}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge tone={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="p-4 text-xs text-muted">{u.lastLogin}</td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleStatus(u.id)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal Add Staff */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-md flex-col rounded-card bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-extrabold text-primary">Tambah Staf Baru</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-lg text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3.5 text-xs">
              <label className="flex flex-col gap-1 font-bold text-ink">
                Nama Lengkap
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="mis. Kasir Sore"
                  className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 font-bold text-ink">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kasir@matwona.local"
                  className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 font-bold text-ink">
                Peran
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CASHIER')}
                  className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
                >
                  <option value="CASHIER">Kasir (Dashboard Kasir Saja)</option>
                  <option value="ADMIN">Admin (Akses Penuh)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold text-ink">
                Kata Sandi Default
                <input
                  type="password"
                  defaultValue="matwona123"
                  className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-muted">Minimal 8 karakter</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button onClick={handleAddStaff}>Simpan Staf</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
