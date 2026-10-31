'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema } from 'shared';
import type { AuthSession } from 'shared';
import { Button, Input } from '@/components/ui';
import { ApiClientError, apiFetch } from '@/lib/api';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

/** Hanya path internal agar `?next=` tidak bisa dipakai untuk mengarahkan ke situs lain. */
export function safeNextPath(next: string | null, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

/** Login staf (FR-009). Kasir → /cashier, admin → /admin, atau kembali ke `?next=`. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as keyof FieldErrors] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await apiFetch<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(parsed.data) });
      queryClient.setQueryData(['me'], session.user);
      router.replace(safeNextPath(params.get('next'), session.user.role === 'ADMIN' ? '/admin' : '/cashier'));
    } catch (error) {
      setSubmitting(false);
      setFormError(error instanceof ApiClientError ? error.message : 'Gagal masuk. Periksa koneksi lalu coba lagi.');
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex w-full flex-col gap-4.5 rounded-[20px] border border-line bg-surface p-6 shadow-[0_16px_40px_color-mix(in_srgb,var(--color-primary)_10%,transparent)] sm:p-9"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-extrabold text-primary">Masuk Dashboard</h1>
        <p className="text-sm text-muted">Untuk kasir dan admin Matwona</p>
      </div>
      {formError && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-control border border-danger/30 bg-danger-soft p-3 text-sm leading-snug font-semibold text-danger-strong"
        >
          <LockIcon />
          <span>{formError}</span>
        </p>
      )}
      <Input
        label="Email"
        type="email"
        autoComplete="username"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        trailing={
          <button
            type="button"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-control text-muted hover:text-ink"
          >
            <EyeIcon crossed={showPassword} />
          </button>
        }
      />
      <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-1">
        {submitting ? 'Masuk…' : 'Masuk'}
      </Button>
      <p className="text-center text-[13px] text-muted">Akun staf dibuat oleh admin.</p>
    </form>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-danger">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}
