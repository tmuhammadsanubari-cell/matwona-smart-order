'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { staffFetch } from '@/lib/staff-api';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function StaffAdmin() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStaff = () => {
    staffFetch<StaffUser[]>('/staff')
      .then((data) => setStaff(data))
      .catch(() => {
        // Fallback demo users if offline
        setStaff([
          { id: 'u1', name: 'Owner Matwona', email: 'owner@matwona.local', role: 'ADMIN', isActive: true, lastLoginAt: '2026-11-11T09:15:00Z', createdAt: '2026-11-01T00:00:00Z' },
          { id: 'u2', name: 'Kasir 1', email: 'kasir@matwona.local', role: 'CASHIER', isActive: true, lastLoginAt: '2026-11-11T10:01:00Z', createdAt: '2026-11-01T00:00:00Z' },
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      await staffFetch(`/staff/${id}/toggle`, { method: 'PATCH' });
      loadStaff();
    } catch {
      setStaff((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
      );
    }
  };

  const handleAddStaff = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await staffFetch('/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          role,
        }),
      });
      setName('');
      setEmail('');
      setPassword('');
      setShowModal(false);
      loadStaff();
    } catch (e: unknown) {
      setErrorMsg((e as { message?: string })?.message ?? 'Gagal menambahkan staf.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus akun staf ini?')) return;
    try {
      await staffFetch(`/staff/${id}`, { method: 'DELETE' });
      loadStaff();
    } catch (e: unknown) {
      alert((e as { message?: string })?.message ?? 'Gagal menghapus staf.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-ink">Daftar Staf & Kasir</h2>
          <p className="text-sm font-semibold text-muted">
            Kelola hak akses kasir dan administrator dapur outlet Matwona.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Tambah Staf Baru</Button>
      </div>

      {/* Staff Table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-cream/30 text-xs font-black uppercase text-muted">
            <tr>
              <th className="px-5 py-3.5">Nama & Email</th>
              <th className="px-5 py-3.5">Peran</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Terakhir Login</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted font-semibold">
                  Memuat data staf...
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted font-semibold">
                  Belum ada staf terdaftar.
                </td>
              </tr>
            ) : (
              staff.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-cream/15">
                  <td className="px-5 py-4">
                    <p className="font-extrabold text-ink">{u.name}</p>
                    <p className="text-xs text-muted font-mono">{u.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={u.role === 'ADMIN' ? 'primary' : 'info'}>
                      {u.role === 'ADMIN' ? 'Administrator' : 'Kasir / Staf'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        u.isActive ? 'text-success' : 'text-muted'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          u.isActive ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-muted">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Belum pernah login'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(u.id)}
                        className={`rounded-control px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                          u.isActive
                            ? 'border border-line text-muted hover:border-danger hover:text-danger'
                            : 'border border-primary text-primary hover:bg-primary-soft'
                        }`}
                      >
                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        aria-label={`Hapus ${u.name}`}
                        className="rounded-control p-1 text-muted transition-colors hover:text-danger cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal Tambah Staf */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-sheet bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-ink">Tambah Staf Baru</h3>
            <p className="mt-0.5 text-xs text-muted">
              Buat kredensial kasir atau admin untuk mengakses dashboard Matwona.
            </p>

            {errorMsg && (
              <div className="mt-3 rounded-control bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddStaff();
              }}
              className="mt-4 flex flex-col gap-3"
            >
              <div>
                <label className="text-xs font-bold text-muted">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati"
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Email Login</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kasir@matwona.local"
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Password (Opsional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan untuk default: Kasir123!"
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Peran / Hak Akses</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CASHIER')}
                  className="mt-1 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                >
                  <option value="CASHIER">Kasir (Akses Pesanan & Pembayaran)</option>
                  <option value="ADMIN">Administrator (Akses Lengkap & Analitik)</option>
                </select>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Akun Staf'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
