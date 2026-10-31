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
      title={`Batalkan ${order?.orderCode ?? ''}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={close}>
            Kembali
          </Button>
          <Button variant="danger" fullWidth loading={busy} onClick={submit}>
            Batalkan pesanan
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Meja {order?.table} · {order?.customerName}. Stok menu akan dikembalikan otomatis.
      </p>
      <Textarea
        label="Alasan pembatalan"
        hint={'Minimal 5 karakter, mis. "Pelanggan batal pesan".'}
        maxLength={200}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={error}
      />
    </BottomSheet>
  );
}
