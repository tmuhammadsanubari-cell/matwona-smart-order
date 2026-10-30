import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { RefreshToken, User } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AuthConfig, LOCKOUT_MS } from './auth.config.js';
import { AuthService, hashToken } from './auth.service.js';

const config: AuthConfig = {
  accessSecret: 'test-access-secret',
  accessExpiresIn: '15m',
  refreshSecret: 'test-refresh-secret',
  refreshExpiresIn: '7d',
  bcryptCost: 4,
  cookieSecure: false,
};

type Where = Record<string, unknown>;
const matches = (row: object, where: Where) =>
  Object.entries(where).every(([k, v]) => (row as Record<string, unknown>)[k] === v);

/** Prisma tiruan in-memory, cukup untuk query yang dipakai AuthService. */
function createFakePrisma(users: User[]) {
  const tokens: RefreshToken[] = [];
  const fake = {
    tokens,
    user: {
      findUnique: async ({ where }: { where: Where }) => users.find((u) => matches(u, where)) ?? null,
      update: async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
        const user = users.find((u) => matches(u, where))!;
        for (const [k, v] of Object.entries(data)) {
          const current = (user as unknown as Record<string, unknown>)[k];
          (user as unknown as Record<string, unknown>)[k] =
            v && typeof v === 'object' && 'increment' in v
              ? (current as number) + (v.increment as number)
              : v;
        }
        return user;
      },
    },
    refreshToken: {
      findUnique: async ({ where }: { where: Where }) => {
        const token = tokens.find((t) => matches(t, where));
        return token ? { ...token, user: users.find((u) => u.id === token.userId)! } : null;
      },
      create: async ({ data }: { data: Pick<RefreshToken, 'userId' | 'tokenHash' | 'expiresAt'> }) => {
        const token = { id: `rt-${tokens.length + 1}`, revokedAt: null, createdAt: new Date(), ...data };
        tokens.push(token);
        return token;
      },
      updateMany: async ({ where, data }: { where: Where; data: Partial<RefreshToken> }) => {
        const hits = tokens.filter((t) => matches(t, where));
        hits.forEach((t) => Object.assign(t, data));
        return { count: hits.length };
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(fake),
  };
  return fake;
}

const PASSWORD = 'Kasir123!';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, config.bcryptCost);
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    outletId: 'outlet-1',
    name: 'Kasir 1',
    email: 'kasir@matwona.local',
    passwordHash,
    role: 'CASHIER',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(user = makeUser()) {
  const prisma = createFakePrisma([user]);
  const service = new AuthService(prisma as unknown as PrismaService, new JwtService(), config);
  return { prisma, service, user };
}

async function expectAppError(promise: Promise<unknown>, code: ErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  return error as AppException;
}

describe('AuthService.login', () => {
  it('login sukses mengembalikan user, token, dan menyimpan hash refresh token', async () => {
    const { service, prisma, user } = setup(makeUser({ failedLoginCount: 2 }));
    const result = await service.login({ email: 'KASIR@matwona.local', password: PASSWORD });

    expect(result.user).toEqual({
      id: 'user-1',
      outletId: 'outlet-1',
      name: 'Kasir 1',
      email: 'kasir@matwona.local',
      role: 'CASHIER',
    });
    expect(result.csrfToken.length).toBeGreaterThan(20);
    expect(prisma.tokens).toHaveLength(1);
    expect(prisma.tokens[0]!.tokenHash).toBe(hashToken(result.refreshToken));
    expect(prisma.tokens[0]!.tokenHash).not.toBe(result.refreshToken);
    expect(user.failedLoginCount).toBe(0);
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });

  it('access token berlaku 15 menit, refresh token 7 hari (NFR-006)', async () => {
    const { service } = setup();
    const before = Date.now();
    const result = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    const minutes = (d: Date) => Math.round((d.getTime() - before) / 60_000);
    expect(minutes(result.accessExpiresAt)).toBe(15);
    expect(minutes(result.refreshExpiresAt)).toBe(7 * 24 * 60);
  });

  it('email tidak terdaftar → UNAUTHORIZED dengan pesan umum', async () => {
    const { service } = setup();
    const error = await expectAppError(
      service.login({ email: 'tidakada@matwona.local', password: PASSWORD }),
      ErrorCode.UNAUTHORIZED,
    );
    expect(error.message).toBe('Email atau password salah.');
  });

  it('gagal 5 kali berturut-turut mengunci akun selama 15 menit (FR-009)', async () => {
    const { service, user } = setup();
    const now = new Date('2026-10-30T05:00:00Z');
    const wrong = { email: user.email, password: 'salah-password' };

    for (let i = 1; i <= 4; i++) {
      await expectAppError(service.login(wrong, now), ErrorCode.UNAUTHORIZED);
      expect(user.failedLoginCount).toBe(i);
    }
    await expectAppError(service.login(wrong, now), ErrorCode.ACCOUNT_LOCKED);
    expect(user.lockedUntil).toEqual(new Date(now.getTime() + LOCKOUT_MS));

    // Selama terkunci, password benar pun ditolak.
    const during = new Date(now.getTime() + LOCKOUT_MS - 1000);
    await expectAppError(service.login({ ...wrong, password: PASSWORD }, during), ErrorCode.ACCOUNT_LOCKED);

    // Setelah 15 menit bisa login lagi dan penghitung direset.
    const after = new Date(now.getTime() + LOCKOUT_MS + 1000);
    await expect(service.login({ ...wrong, password: PASSWORD }, after)).resolves.toBeDefined();
    expect(user.lockedUntil).toBeNull();
    expect(user.failedLoginCount).toBe(0);
  });

  it('login sukses mereset penghitung gagal sehingga kegagalan tidak harus berturut-turut dihitung', async () => {
    const { service, user } = setup(makeUser({ failedLoginCount: 4 }));
    await service.login({ email: user.email, password: PASSWORD });
    await expectAppError(
      service.login({ email: user.email, password: 'salah-password' }),
      ErrorCode.UNAUTHORIZED,
    );
    expect(user.failedLoginCount).toBe(1);
  });

  it('akun nonaktif tidak bisa login dan refresh token-nya dicabut (FR-009)', async () => {
    const { service, prisma, user } = setup();
    await service.login({ email: user.email, password: PASSWORD });
    user.isActive = false;

    const error = await expectAppError(
      service.login({ email: user.email, password: PASSWORD }),
      ErrorCode.UNAUTHORIZED,
    );
    expect(error.message).toContain('dinonaktifkan');
    expect(prisma.tokens.every((t) => t.revokedAt !== null)).toBe(true);
  });
});

describe('AuthService.refresh', () => {
  it('merotasi refresh token: token lama dicabut, token baru disimpan', async () => {
    const { service, prisma } = setup();
    const first = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(prisma.tokens).toHaveLength(2);
    expect(prisma.tokens[0]!.revokedAt).not.toBeNull();
    expect(prisma.tokens[1]!.revokedAt).toBeNull();
  });

  it('memakai ulang refresh token lama mencabut semua sesi user', async () => {
    const { service, prisma } = setup();
    const first = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    const second = await service.refresh(first.refreshToken);

    await expectAppError(service.refresh(first.refreshToken), ErrorCode.UNAUTHORIZED);
    expect(prisma.tokens.every((t) => t.revokedAt !== null)).toBe(true);
    await expectAppError(service.refresh(second.refreshToken), ErrorCode.UNAUTHORIZED);
  });

  it('akun nonaktif tidak bisa refresh dan token-nya dicabut (FR-009)', async () => {
    const { service, prisma, user } = setup();
    const session = await service.login({ email: user.email, password: PASSWORD });
    user.isActive = false;

    await expectAppError(service.refresh(session.refreshToken), ErrorCode.UNAUTHORIZED);
    expect(prisma.tokens[0]!.revokedAt).not.toBeNull();
  });

  it('menolak token kosong, palsu, atau yang ditandatangani dengan secret access', async () => {
    const { service } = setup();
    const session = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    await expectAppError(service.refresh(undefined), ErrorCode.UNAUTHORIZED);
    await expectAppError(service.refresh('bukan-jwt'), ErrorCode.UNAUTHORIZED);
    await expectAppError(service.refresh(session.accessToken), ErrorCode.UNAUTHORIZED);
  });
});

describe('AuthService.logout', () => {
  it('mencabut refresh token sesi ini sehingga tidak bisa dipakai refresh (FR-009)', async () => {
    const { service, prisma } = setup();
    const session = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    await service.logout(session.refreshToken);

    expect(prisma.tokens[0]!.revokedAt).not.toBeNull();
    await expectAppError(service.refresh(session.refreshToken), ErrorCode.UNAUTHORIZED);
  });

  it('aman dipanggil tanpa token', async () => {
    const { service } = setup();
    await expect(service.logout(undefined)).resolves.toBeUndefined();
  });
});

describe('AuthService.verifyAccessToken', () => {
  it('mengembalikan data user terbaru dari DB', async () => {
    const { service, user } = setup();
    const session = await service.login({ email: user.email, password: PASSWORD });
    user.role = 'ADMIN';
    await expect(service.verifyAccessToken(session.accessToken)).resolves.toMatchObject({
      id: user.id,
      role: 'ADMIN',
    });
  });

  it('menolak akun yang dinonaktifkan meski access token belum kedaluwarsa', async () => {
    const { service, user } = setup();
    const session = await service.login({ email: user.email, password: PASSWORD });
    user.isActive = false;
    await expectAppError(service.verifyAccessToken(session.accessToken), ErrorCode.UNAUTHORIZED);
  });

  it('menolak refresh token yang dipakai sebagai access token', async () => {
    const { service } = setup();
    const session = await service.login({ email: 'kasir@matwona.local', password: PASSWORD });
    await expectAppError(service.verifyAccessToken(session.refreshToken), ErrorCode.UNAUTHORIZED);
  });
});
