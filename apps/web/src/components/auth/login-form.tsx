'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema } from 'shared';
import type { AuthSession } from 'shared';
import { Button, Card, Input } from '@/components/ui';
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
    <Card className="w-full">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
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
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        {formError && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>
    </Card>
  );
}
