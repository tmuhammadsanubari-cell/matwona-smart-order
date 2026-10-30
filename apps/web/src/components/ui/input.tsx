'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

interface FieldProps {
  label: string;
  /** Petunjuk di bawah field, mis. "Opsional" atau "Maks. 120 karakter". */
  hint?: ReactNode;
  /** Pesan error (bahasa Indonesia); field ditandai aria-invalid. */
  error?: string;
}

const control = (invalid: boolean) =>
  cx(
    'w-full rounded-xl border-2 bg-surface px-3 text-base text-ink placeholder:text-muted',
    'focus:border-primary focus:outline-none disabled:opacity-60',
    invalid ? 'border-danger' : 'border-line',
  );

function useFieldIds(id: string | undefined, hint: unknown, error: unknown) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return { fieldId, hintId, errorId, describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined };
}

function Field({
  fieldId,
  hintId,
  errorId,
  label,
  hint,
  error,
  children,
}: FieldProps & { fieldId: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  ref?: Ref<HTMLInputElement>;
}

/** Input berlabel. Font 16 px agar iOS tidak auto-zoom; tinggi 48 px (NFR-012). */
export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Field {...ids} label={label} hint={hint} error={error}>
      <input
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(control(Boolean(error)), 'min-h-12', className)}
        {...props}
      />
    </Field>
  );
}

export interface TextareaProps extends FieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

/** Textarea berlabel, mis. catatan item "sambal dipisah" (maks. 120 karakter, FR-003). */
export function Textarea({ label, hint, error, id, className, rows = 3, ...props }: TextareaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Field {...ids} label={label} hint={hint} error={error}>
      <textarea
        id={ids.fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(control(Boolean(error)), 'py-2', className)}
        {...props}
      />
    </Field>
  );
}
