import { cx } from './cx';

export type ProgressStepState = 'done' | 'current' | 'todo';

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
  /** Keterangan kecil di bawah label, mis. jam "12:10" atau "Sekarang". */
  time?: string;
}

export interface ProgressStepsProps {
  steps: ProgressStep[];
  /** `horizontal` = ringkas (design system); `vertical` = timeline halaman status (desain C6). */
  orientation?: 'horizontal' | 'vertical';
  /** Nama daftar untuk pembaca layar, mis. "Progres pesanan". */
  'aria-label'?: string;
  className?: string;
}

const CIRCLE: Record<ProgressStepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-accent bg-cream text-primary',
  todo: 'border-line-strong bg-surface text-muted',
};

const DOT: Record<ProgressStepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-accent bg-accent motion-safe:animate-[pulse-ring_1.4s_ease-out_infinite]',
  todo: 'border-line-strong bg-surface',
};

const LABEL: Record<ProgressStepState, string> = {
  done: 'font-bold text-ink',
  current: 'font-extrabold text-primary',
  todo: 'font-semibold text-muted',
};

function CheckIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/** Langkah status pesanan: Menunggu Pembayaran → Diterima Kasir → Disiapkan → Disajikan (FR-007). */
export function ProgressSteps({ steps, orientation = 'horizontal', className, ...aria }: ProgressStepsProps) {
  if (orientation === 'vertical') {
    return (
      <ol className={cx('flex flex-col', className)} {...aria}>
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li key={step.label} aria-current={step.state === 'current' ? 'step' : undefined} className="flex gap-3.5">
              <div aria-hidden="true" className="flex w-6 flex-col items-center">
                <span
                  className={cx('flex size-[22px] shrink-0 items-center justify-center rounded-full border-2', DOT[step.state])}
                >
                  {step.state === 'done' && <CheckIcon size={12} />}
                </span>
                {!last && (
                  <span className={cx('min-h-7 w-0.5 flex-1', step.state === 'done' ? 'bg-primary' : 'bg-line-strong')} />
                )}
              </div>
              <div className={cx('flex flex-col gap-0.5', !last && 'pb-4.5')}>
                <span className={cx('text-[15px] leading-snug', LABEL[step.state])}>
                  {step.label}
                  {step.state === 'done' && <span className="sr-only"> (selesai)</span>}
                </span>
                {step.time && <span className="text-xs font-semibold text-muted">{step.time}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cx('flex items-start', className)} {...aria}>
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
