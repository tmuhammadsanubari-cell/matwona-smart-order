'use client';

import { useState } from 'react';
import { cancelOrderSchema } from 'shared';
import type { StaffOrderDto } from 'shared';
import { BottomSheet, Button, Textarea } from '@/components/ui';

export interface CancelOrderSheetProps {
  order: StaffOrderDto | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Batalkan pesanan dengan alasan wajib (min. 5 karakter, PRD 2.2.5); stok dikembalikan server. */
export function CancelOrderSheet({ order, busy, onClose, onConfirm }: CancelOrderSheetProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  const close = () => {
    setReason('');
    setError(undefined);
    onClose();
  };

  const submit = () => {
    const parsed = cancelOrderSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    onConfirm(parsed.data.reason);
    setReason('');
    setError(undefined);
  };

  return (
    <BottomSheet
      open={order !== null}
      onClose={close}
      title={`Batalkan pesanan ${order?.orderCode ?? ''}?`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={close}>
            Kembali
          </Button>
          <Button variant="danger" fullWidth loading={busy} onClick={submit}>
            Batalkan Pesanan
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-danger-soft text-danger">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />
            </svg>
          </span>
          <p className="text-sm text-muted">
            Meja {order?.table} · {order?.customerName}
          </p>
        </div>
        <Textarea
          label="Alasan pembatalan"
          hint={'Min. 5 karakter, mis. "Pelanggan batal pesan".'}
          placeholder="Minimal 5 karakter"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error}
        />
        <p className="flex items-center gap-2 rounded-control bg-info-soft px-3 py-2.5 text-[13px] font-bold text-info">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          Stok item akan dikembalikan
        </p>
      </div>
    </BottomSheet>
  );
}
