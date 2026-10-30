import type { JwtSignOptions } from '@nestjs/jwt';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export interface AuthConfig {
  accessSecret: string;
  accessExpiresIn: NonNullable<JwtSignOptions['expiresIn']>;
  refreshSecret: string;
  refreshExpiresIn: NonNullable<JwtSignOptions['expiresIn']>;
  bcryptCost: number;
  /** Cookie `Secure` (NFR-005). Wajib true di staging/produksi. */
  cookieSecure: boolean;
  /** Domain cookie, mis. `.matwona.id` agar web & api di subdomain berbeda bisa berbagi cookie. */
  cookieDomain?: string;
}

/** Batas lockout login (FR-009): 5 gagal berturut-turut → kunci 15 menit. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const accessSecret = env.JWT_ACCESS_SECRET;
  const refreshSecret = env.JWT_REFRESH_SECRET;
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET wajib diisi di .env');
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET harus berbeda');
  }
  return {
    accessSecret,
    refreshSecret,
    // Nilai berformat `ms` (mis. 15m, 7d) diteruskan apa adanya ke jsonwebtoken.
    accessExpiresIn: (env.JWT_ACCESS_EXPIRES_IN ?? '15m') as AuthConfig['accessExpiresIn'],
    refreshExpiresIn: (env.JWT_REFRESH_EXPIRES_IN ?? '7d') as AuthConfig['refreshExpiresIn'],
    bcryptCost: Number(env.BCRYPT_COST ?? 12),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production',
    cookieDomain: env.COOKIE_DOMAIN || undefined,
  };
}
