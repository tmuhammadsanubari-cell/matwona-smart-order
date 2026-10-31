'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

/** Lama toast tampil sebelum hilang sendiri. */
export const TOAST_DURATION_MS = 2500;

interface ToastState {
  message: string | null;
  /** Bertambah setiap toast baru agar pesan yang sama tetap memulai ulang timer. */
  seq: number;
  show: (message: string) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((state) => ({ message, seq: state.seq + 1 })),
  hide: () => set({ message: null }),
}));

/** Tampilkan toast singkat, mis. toast('Ditambahkan ke keranjang'). Butuh <Toaster /> terpasang di layout. */
export function toast(message: string) {
  useToastStore.getState().show(message);
}

/** Tampilan toast: kotak gelap dengan ikon centang. */
export function Toast({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-control bg-ink px-4 py-3 text-sm font-semibold text-primary-foreground shadow-toast">
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="shrink-0 text-accent"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
      {message}
    </div>
  );
}

/** Wadah toast di atas layar; pasang sekali (mis. di layout pelanggan). */
export function Toaster() {
  const { message, seq, hide } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, seq, hide]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
    >
      {message && <Toast key={seq} message={message} />}
    </div>
  );
}
