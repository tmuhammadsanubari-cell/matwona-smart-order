'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Area bawah yang selalu terlihat, mis. total & tombol "Pesan Sekarang" (PRD 4.9). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Panel dari bawah layar (keranjang, detail item, catatan). Modal: Escape / klik latar menutup,
 * scroll halaman dikunci, fokus dijaga di dalam panel lalu dikembalikan ke pemicu saat ditutup.
 */
export function BottomSheet({ open, onClose, title, children, footer, className }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    // Jaga fokus tetap di dalam panel.
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" onKeyDown={handleKeyDown}>
      <div
        data-testid="bottom-sheet-backdrop"
        aria-hidden="true"
        className="absolute inset-0 bg-ink/50 motion-safe:animate-[fade-in_150ms_ease-out]"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-sheet bg-surface shadow-xl',
          'motion-safe:animate-[sheet-up_200ms_ease-out] focus:outline-none',
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" />
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 pb-2">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => onCloseRef.current()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-muted hover:bg-line"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
        {footer && (
          <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
