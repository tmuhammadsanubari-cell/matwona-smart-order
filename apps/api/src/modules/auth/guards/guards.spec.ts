import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_COOKIE, AuthUser, ErrorCode, UserRole } from 'shared';
import { AppException } from '../../../common/app.exception.js';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../common/decorators/auth.decorators.js';
import type { AuthService } from '../auth.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

interface FakeRequest {
  method: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  user?: AuthUser;
}

const cashier: AuthUser = {
  id: 'u1',
  outletId: 'o1',
  name: 'Kasir 1',
  email: 'kasir@matwona.local',
  role: 'CASHIER',
};

function context(req: Partial<FakeRequest>, metadata: Record<string, unknown> = {}) {
  const request: FakeRequest = { method: 'GET', headers: {}, cookies: {}, ...req };
  const handler = () => undefined;
  for (const [key, value] of Object.entries(metadata)) Reflect.defineMetadata(key, value, handler);
  const ctx = {
    getType: () => 'http',
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as AppException).code;
  }
  return undefined;
};

describe('JwtAuthGuard', () => {
  const auth = {
    verifyAccessToken: vi.fn(async (token: string) => {
      if (token !== 'valid') throw new AppException(ErrorCode.UNAUTHORIZED, 'x');
      return cashier;
    }),
  } as unknown as AuthService;
  const guard = new JwtAuthGuard(new Reflector(), auth);

  it('melewatkan endpoint @Public()', async () => {
    await expect(guard.canActivate(context({}, { [IS_PUBLIC_KEY]: true }).ctx)).resolves.toBe(true);
  });

  it('menolak 401 tanpa token', async () => {
    await expect(guard.canActivate(context({}).ctx)).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  it('membaca token dari cookie dan memasang req.user', async () => {
    const { ctx, request } = context({ cookies: { [AUTH_COOKIE.ACCESS]: 'valid' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual(cashier);
  });

  it('menerima header Authorization: Bearer', async () => {
    const { ctx, request } = context({ headers: { authorization: 'Bearer valid' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual(cashier);
  });

  it('menolak token tidak valid', async () => {
    const { ctx } = context({ cookies: { [AUTH_COOKIE.ACCESS]: 'palsu' } });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({ code: ErrorCode.UNAUTHORIZED });
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const adminOnly = { [ROLES_KEY]: ['ADMIN'] satisfies UserRole[] };

  it('kasir yang mengakses endpoint ADMIN mendapat 403 (FR-009)', () => {
    expect(errorCode(() => guard.canActivate(context({ user: cashier }, adminOnly).ctx))).toBe(
      ErrorCode.FORBIDDEN,
    );
  });

  it('admin boleh mengakses endpoint ADMIN', () => {
    const admin = { ...cashier, role: 'ADMIN' as const };
    expect(guard.canActivate(context({ user: admin }, adminOnly).ctx)).toBe(true);
  });

  it('kasir boleh mengakses endpoint CASHIER, ADMIN', () => {
    const meta = { [ROLES_KEY]: ['CASHIER', 'ADMIN'] satisfies UserRole[] };
    expect(guard.canActivate(context({ user: cashier }, meta).ctx)).toBe(true);
  });

  it('tanpa @Roles cukup login', () => {
    expect(guard.canActivate(context({ user: cashier }).ctx)).toBe(true);
  });
});

describe('CsrfGuard', () => {
  const guard = new CsrfGuard(new Reflector());
  const session = { [AUTH_COOKIE.ACCESS]: 'jwt', [AUTH_COOKIE.CSRF]: 'csrf-123' };

  it('GET tidak diperiksa', () => {
    expect(guard.canActivate(context({ method: 'GET', cookies: session }).ctx)).toBe(true);
  });

  it('POST dengan cookie sesi tanpa header X-CSRF-Token ditolak 403', () => {
    expect(errorCode(() => guard.canActivate(context({ method: 'POST', cookies: session }).ctx))).toBe(
      ErrorCode.FORBIDDEN,
    );
  });

  it('POST dengan header yang tidak cocok ditolak 403', () => {
    const { ctx } = context({ method: 'PATCH', cookies: session, headers: { 'x-csrf-token': 'lain' } });
    expect(errorCode(() => guard.canActivate(ctx))).toBe(ErrorCode.FORBIDDEN);
  });

  it('POST dengan header yang cocok diterima', () => {
    const { ctx } = context({ method: 'POST', cookies: session, headers: { 'x-csrf-token': 'csrf-123' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('endpoint publik dan klien Bearer (tanpa cookie sesi) dilewati', () => {
    expect(guard.canActivate(context({ method: 'POST', cookies: session }, { [IS_PUBLIC_KEY]: true }).ctx)).toBe(
      true,
    );
    expect(guard.canActivate(context({ method: 'POST', headers: { authorization: 'Bearer x' } }).ctx)).toBe(
      true,
    );
  });
});
