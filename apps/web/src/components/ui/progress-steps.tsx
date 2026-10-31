import { cx } from './cx';

export type ProgressStepState = 'done' | 'current' | 'todo';

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
  /** Keterangan kecil di bawah label, mis. jam "12:10" atau "Sekarang". */
  time?: string;
}

const CIRCLE: Record<ProgressStepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-accent bg-cream text-primary',
  todo: 'border-line-strong bg-surface text-muted',
};

/** Langkah status pesanan mendatar, mis. Menunggu Pembayaran → Diterima Kasir → Disiapkan → Disajikan (FR-007). */
export function ProgressSteps({ steps, className }: { steps: ProgressStep[]; className?: string }) {
  return (
    <ol className={cx('flex items-start', className)}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <span
            aria-hidden="true"
            className={cx(
              'flex size-8 items-center justify-center rounded-full border-2 text-sm font-extrabold',
              CIRCLE[step.state],
            )}
          >
            {step.state === 'done' ? '✓' : index + 1}
          </span>
          <span className={cx('text-[13px] leading-tight font-bold', step.state === 'todo' ? 'text-muted' : 'text-ink')}>
            {step.label}
            {step.state === 'done' && <span className="sr-only"> (selesai)</span>}
          </span>
          {step.time && <span className="text-xs text-muted">{step.time}</span>}
        </li>
      ))}
    </ol>
  );
}
