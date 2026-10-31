'use client';

import { useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
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
    'w-full rounded-control border-[1.5px] bg-surface px-3.5 text-base text-ink placeholder:text-muted',
    'focus:border-primary focus:outline-none disabled:bg-disabled disabled:text-neutral',
    invalid ? 'border-danger' : 'border-line-strong',
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
  counter,
  children,
}: FieldProps & { fieldId: string; hintId?: string; errorId?: string; counter?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      {(hint || counter) && (
        <div className="flex items-start justify-between gap-3 text-xs text-muted">
          {hint && <p id={hintId}>{hint}</p>}
          {counter}
        </div>
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

/**
 * Textarea berlabel, mis. catatan item "sambal dipisah" (maks. 120 karakter, FR-003).
 * Bila `maxLength` diisi, penghitung "n/maks" tampil di kanan bawah.
 */
export function Textarea({ label, hint, error, id, className, rows = 3, onChange, ...props }: TextareaProps) {
  const ids = useFieldIds(id, hint, error);
  const [typed, setTyped] = useState(String(props.defaultValue ?? '').length);
  const length = props.value === undefined ? typed : String(props.value).length;
  const counter = props.maxLength ? (
    <span className="ml-auto shrink-0 tabular-nums" aria-hidden="true">
      {length}/{props.maxLength}
    </span>
  ) : undefined;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTyped(event.target.value.length);
    onChange?.(event);
  };

  return (
    <Field {...ids} label={label} hint={hint} error={error} counter={counter}>
      <textarea
        id={ids.fieldId}
        rows={rows}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(control(Boolean(error)), 'resize-none py-3', className)}
        {...props}
      />
    </Field>
  );
}
