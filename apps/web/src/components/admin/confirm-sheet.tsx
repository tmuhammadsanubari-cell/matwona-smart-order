'use client';

import type { ReactNode } from 'react';
import { BottomSheet, Button } from '@/components/ui';

export interface ConfirmSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  /** Pesan error dari server bila aksi gagal. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Konfirmasi aksi yang tidak bisa dibatalkan dengan mudah (arsip menu, hapus kategori). */
export function ConfirmSheet({ open, title, children, confirmLabel, busy, error, onConfirm, onClose }: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Kembali
          </Button>
          <Button variant="danger" fullWidth loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        {children}
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
