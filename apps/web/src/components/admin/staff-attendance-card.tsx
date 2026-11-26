'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { StaffAttendanceDto, StaffPinOptionDto } from 'shared';
import { ApiClientError } from '@/lib/api';
import { todayWib } from '@/lib/cashier-board';
import { staffFetch } from '@/lib/staff-api';
import { Badge, Button, Card, Input, toast } from '@/components/ui';

function shiftDateDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const formatWibDateTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

function formatDuration(clockInIso: string, clockOutIso: string | null): string {
  if (!clockOutIso) return 'Sedang shift';
  const diffMin = Math.max(0, Math.round((new Date(clockOutIso).getTime() - new Date(clockInIso).getTime()) / 60_000));
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
}

export function StaffPinButton({ userId, userName }: { userId: string; userName: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (newPin: string) =>
      staffFetch(`/staff/${userId}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pin: newPin }),
      }),
    onSuccess: () => {
      toast(`PIN absensi ${userName} berhasil diperbarui`);
      setPin('');
      setErrorMsg(null);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['attendance-staff-options'] });
    },
    onError: (err) => {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Gagal menyimpan PIN.');
    },
  });

  const handleSubmit = () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setErrorMsg('PIN harus berupa 4–6 digit angka.');
      return;
    }
    setErrorMsg(null);
    mutation.mutate(pin);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPin('');
          setErrorMsg(null);
          setOpen(true);
        }}
        className="rounded-control border border-primary/30 bg-primary-soft/60 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-soft cursor-pointer"
      >
        Atur PIN
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pin-dialog-${userId}`}
        >
          <div className="w-full max-w-sm rounded-sheet bg-surface p-5 text-left shadow-xl">
            <h3 id={`pin-dialog-${userId}`} className="text-base font-extrabold text-ink">
              Atur PIN Absensi · {userName}
            </h3>
            <p className="mt-1 text-xs text-muted">
              Staf memasukkan PIN 4–6 digit ini di dashboard kasir saat absen masuk &amp; pulang.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="mt-4 space-y-4"
            >
              <Input
                label="PIN Baru (4–6 digit angka)"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Contoh: 1234"
                value={pin}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                error={errorMsg ?? undefined}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={mutation.isPending}>
                  Simpan PIN
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function StaffAttendanceCard() {
  const [today] = useState(() => todayWib());
  const [from, setFrom] = useState(() => shiftDateDays(todayWib(), -6));
  const [to, setTo] = useState(() => todayWib());

  const pinStatusQuery = useQuery({
    queryKey: ['attendance-staff-options'],
    queryFn: () => staffFetch<StaffPinOptionDto[]>('/attendance/staff-options'),
    retry: false,
  });

  const logsQuery = useQuery({
    queryKey: ['admin-attendance-logs', from, to],
    queryFn: () => staffFetch<StaffAttendanceDto[]>(`/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    retry: false,
  });

  const pinStatusList = pinStatusQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink">Rekap Absensi Karyawan</h2>
          <p className="mt-0.5 text-xs text-muted">
            Log jam masuk &amp; jam pulang staf yang dicatat memakai PIN di dashboard kasir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 font-bold text-muted">
            Dari
            <input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink"
            />
          </label>
          <label className="flex items-center gap-1.5 font-bold text-muted">
            Sampai
            <input
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink"
            />
          </label>
        </div>
      </div>

      {pinStatusList.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pinStatusList.map((s) => (
            <Badge key={s.id} tone={s.clockedIn ? 'success' : s.hasPin ? 'neutral' : 'warning'}>
              {s.name}: {s.clockedIn ? 'Sedang Shift' : s.hasPin ? 'PIN Aktif' : 'Belum Set PIN'}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-bold">Nama Staf</th>
              <th className="py-2 pr-3 font-bold">Masuk</th>
              <th className="py-2 pr-3 font-bold">Pulang</th>
              <th className="py-2 pr-3 font-bold">Durasi</th>
              <th className="py-2 font-bold">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted">
                  Memuat log absensi...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted">
                  Belum ada catatan absensi pada rentang tanggal ini.
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pr-3 font-bold text-ink">
                    {row.userName}{' '}
                    <span className="font-normal text-muted">
                      ({row.userRole === 'ADMIN' ? 'Admin' : 'Kasir'})
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-ink">{formatWibDateTime(row.clockInAt)}</td>
                  <td className="py-2.5 pr-3 text-ink">
                    {row.clockOutAt ? formatWibDateTime(row.clockOutAt) : (
                      <Badge tone="success">Aktif</Badge>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-muted">{formatDuration(row.clockInAt, row.clockOutAt)}</td>
                  <td className="py-2.5 text-muted">{row.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
