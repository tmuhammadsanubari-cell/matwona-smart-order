import { z } from 'zod';
import type { UserRole } from '../enums.js';

export const loginSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Data staf yang login, dikembalikan oleh /auth/login, /auth/refresh, /auth/me (FR-009). */
export interface AuthUser {
  id: string;
  outletId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  /** Nilai untuk header X-CSRF-Token pada request staf yang mengubah data (PRD 4.4). */
  csrfToken: string;
}

export const AUTH_COOKIE = {
  ACCESS: 'mtw_access',
  REFRESH: 'mtw_refresh',
  CSRF: 'mtw_csrf',
} as const;

export const CSRF_HEADER = 'x-csrf-token';
