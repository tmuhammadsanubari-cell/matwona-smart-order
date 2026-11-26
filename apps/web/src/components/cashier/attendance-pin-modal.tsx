'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { StaffAttendanceDto, StaffPinOptionDto } from 'shared';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { Badge, Button, Input, toast } from '@/components/ui';

export interface AttendancePinModalProps {
  open: boolean;
  onClose: () => void;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'] as const;

export function AttendancePinModal({ open, onClose }: AttendancePinModalProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<StaffAttendanceDto | null>(null);

  const staffQuery = useQuery({
    queryKey: ['attendance-staff-options'],
    queryFn: () => staffFetch<StaffPinOptionDto[]>('/attendance/staff-options'),
    enabled: open,
    retry: false,
  });

  const clockMutation = useMutation({
    mutationFn: (payload: { userId: string; pin: string; action: 'IN' | 'OUT'; note?: string }) =>
      staffFetch<StaffAttendanceDto>('/attendance/clock', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (record, vars) => {
      setPin('');
      setNote('');
      setErrorMsg(null);
      setLastRecord(record);
      toast(`${record.userName} berhasil absen ${vars.action === 'IN' ? 'MASUK' : 'PULANG'}`);
      void queryClient.invalidateQueries({ queryKey: ['attendance-staff-options'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-attendance-logs'] });
    },
    onError: (err) => {
      const message = err instanceof ApiClientError ? err.message : 'Gagal mencatat absensi.';
      setErrorMsg(message);
    },
  });

  if (!open) return null;

  const staffList = staffQuery.data ?? [];
  const activeUser = staffList.find((s) => s.id === selectedUserId) ?? staffList[0];

  const handleKeypad = (key: (typeof KEYPAD_KEYS)[number]) => {
    setErrorMsg(null);
    if (key === 'C') {
      setPin('');
      return;
    }
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPin((prev) => (prev.length >= 6 ? prev : `${prev}${key}`));
  };

  const submit = (action: 'IN' | 'OUT') => {
    if (!activeUser) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setErrorMsg('Masukkan PIN 4–6 digit angka terlebih dahulu.');
      return;
    }
    setErrorMsg(null);
    clockMutation.mutate({
      userId: activeUser.id,
      pin,
      action,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-sheet bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="attendance-modal-title" className="text-lg font-extrabold text-ink">
              Absensi Karyawan (PIN)
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Pilih nama staf lalu masukkan PIN 4–6 digit untuk absen masuk atau pulang.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>

        {lastRecord && (
          <div className="mt-3 rounded-card border border-primary/25 bg-success-soft px-3.5 py-2.5 text-xs text-primary-hover">
            Tercatat untuk <span className="font-bold">{lastRecord.userName}</span>:{' '}
            {lastRecord.clockOutAt
              ? `Pulang pukul ${formatTime(lastRecord.clockOutAt)} WIB`
              : `Masuk pukul ${formatTime(lastRecord.clockInAt)} WIB`}
          </div>
        )}

        {staffQuery.isLoading ? (
          <p className="mt-5 text-sm text-muted">Memuat daftar staf...</p>
        ) : staffList.length === 0 ? (
          <p className="mt-5 text-sm text-muted">Belum ada staf aktif di outlet ini.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="attendance-staff-select" className="text-xs font-bold text-muted">
                Pilih Nama Staf
              </label>
              <select
                id="attendance-staff-select"
                value={activeUser?.id ?? ''}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setErrorMsg(null);
                  setLastRecord(null);
                }}
                className="mt-1 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'ADMIN' ? 'Admin' : 'Kasir'}) {s.clockedIn ? '• Sedang Shift' : ''}
                  </option>
                ))}
              </select>

              {activeUser && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge tone={activeUser.clockedIn ? 'success' : 'neutral'}>
                      {activeUser.clockedIn ? 'Sedang Shift (Masuk)' : 'Belum Absen Masuk'}
                    </Badge>
                    {!activeUser.hasPin && <Badge tone="warning">PIN Belum Diatur</Badge>}
                  </div>
                  {activeUser.lastClockInAt && (
                    <span className="text-muted">Masuk: {formatTime(activeUser.lastClockInAt)} WIB</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Input
                label="PIN Absensi (4–6 digit)"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                error={errorMsg ?? undefined}
              />

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypad(key)}
                    className="min-h-11 rounded-control border border-line bg-cream text-base font-extrabold text-ink transition-colors hover:bg-primary-soft active:bg-primary active:text-cream"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Catatan Shift (Opsional)"
              placeholder="Contoh: Shift pagi kasir depan"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                variant={activeUser?.clockedIn ? 'secondary' : 'primary'}
                loading={clockMutation.isPending}
                disabled={!activeUser || !activeUser.hasPin || activeUser.clockedIn}
                onClick={() => submit('IN')}
              >
                Absen Masuk
              </Button>
              <Button
                type="button"
                variant={activeUser?.clockedIn ? 'primary' : 'secondary'}
                loading={clockMutation.isPending}
                disabled={!activeUser || !activeUser.hasPin || !activeUser.clockedIn}
                onClick={() => submit('OUT')}
              >
                Absen Pulang
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
