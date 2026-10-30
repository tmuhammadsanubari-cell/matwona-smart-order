import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE } from 'shared';
import type { AuthConfig } from './auth.config.js';
import type { IssuedTokens } from './auth.service.js';

/** Refresh token hanya dikirim browser ke endpoint auth. */
const REFRESH_PATH = '/api/auth';

function baseOptions(config: AuthConfig): CookieOptions {
  return { secure: config.cookieSecure, sameSite: 'lax', domain: config.cookieDomain };
}

/** Cookie access & refresh `HttpOnly; Secure; SameSite=Lax` + cookie CSRF yang bisa dibaca JS (PRD 4.4). */
export function setAuthCookies(res: Response, tokens: IssuedTokens, config: AuthConfig) {
  const base = baseOptions(config);
  res.cookie(AUTH_COOKIE.ACCESS, tokens.accessToken, {
    ...base,
    httpOnly: true,
    path: '/',
    expires: tokens.accessExpiresAt,
  });
  res.cookie(AUTH_COOKIE.REFRESH, tokens.refreshToken, {
    ...base,
    httpOnly: true,
    path: REFRESH_PATH,
    expires: tokens.refreshExpiresAt,
  });
  res.cookie(AUTH_COOKIE.CSRF, tokens.csrfToken, {
    ...base,
    httpOnly: false,
    path: '/',
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(res: Response, config: AuthConfig) {
  const base = baseOptions(config);
  res.clearCookie(AUTH_COOKIE.ACCESS, { ...base, httpOnly: true, path: '/' });
  res.clearCookie(AUTH_COOKIE.REFRESH, { ...base, httpOnly: true, path: REFRESH_PATH });
  res.clearCookie(AUTH_COOKIE.CSRF, { ...base, path: '/' });
}
