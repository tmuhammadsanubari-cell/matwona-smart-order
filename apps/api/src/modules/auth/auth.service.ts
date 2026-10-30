import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthUser, ErrorCode, LoginInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { Prisma, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_CONFIG, LOCKOUT_MS, MAX_FAILED_LOGINS } from './auth.config.js';
import type { AuthConfig } from './auth.config.js';

interface AccessPayload {
  sub: string;
  role: string;
  outletId: string;
}

interface RefreshPayload {
  sub: string;
  jti: string;
}

export interface IssuedTokens {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
  csrfToken: string;
}

export interface AuthResult extends IssuedTokens {
  user: AuthUser;
}

type Db = Pick<Prisma.TransactionClient, 'refreshToken'>;

const INVALID_CREDENTIALS = 'Email atau password salah.';
const SESSION_EXPIRED = 'Sesi berakhir. Silakan login kembali.';
const ACCOUNT_INACTIVE = 'Akun Anda sudah dinonaktifkan. Hubungi admin.';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  outletId: user.outletId,
  name: user.name,
  email: user.email,
  role: user.role,
});

/** Login staf, rotasi refresh token, lockout (FR-009, NFR-006, PRD 4.4). */
@Injectable()
export class AuthService {
  /** Hash pembanding untuk email tak dikenal, agar waktu respons tidak membocorkan email terdaftar. */
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async login({ email, password }: LoginInput, now = new Date()): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      this.dummyHash ??= bcrypt.hash('matwona-dummy-password', this.config.bcryptCost);
      await bcrypt.compare(password, await this.dummyHash);
      throw new AppException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      throw this.lockedError(user.lockedUntil);
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      const { failedLoginCount } = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      if (failedLoginCount >= MAX_FAILED_LOGINS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil },
        });
        throw this.lockedError(lockedUntil);
      }
      throw new AppException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      await this.revokeAllForUser(user.id, now);
      throw new AppException(ErrorCode.UNAUTHORIZED, ACCOUNT_INACTIVE);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    const authUser = toAuthUser(user);
    return { user: authUser, ...(await this.issueTokens(this.prisma, authUser)) };
  }

  /** Tukar refresh token dengan pasangan token baru. Token lama langsung dicabut (rotasi). */
  async refresh(refreshToken: string | undefined, now = new Date()): Promise<AuthResult> {
    if (!refreshToken) throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);

    try {
      await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.config.refreshSecret });
    } catch {
      throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!record || record.expiresAt <= now) {
      throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
    }
    if (record.revokedAt) {
      // Token yang sudah dirotasi dipakai lagi → kemungkinan dicuri. Cabut semua sesi user ini.
      await this.revokeAllForUser(record.userId, now);
      throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
    }
    if (!record.user.isActive) {
      await this.revokeAllForUser(record.userId, now);
      throw new AppException(ErrorCode.UNAUTHORIZED, ACCOUNT_INACTIVE);
    }

    const authUser = toAuthUser(record.user);
    const tokens = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: now },
      });
      // Request paralel dengan token yang sama: hanya satu yang boleh menang.
      if (count === 0) throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
      return this.issueTokens(tx, authUser);
    });
    return { user: authUser, ...tokens };
  }

  /** Cabut refresh token milik sesi ini. Aman dipanggil tanpa token. */
  async logout(refreshToken: string | undefined, now = new Date()): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: now },
    });
  }

  /** Dipakai saat akun dinonaktifkan (S2-12) dan saat deteksi pemakaian ulang refresh token. */
  async revokeAllForUser(userId: string, now = new Date()): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  /**
   * Validasi access token untuk JwtAuthGuard. Data user diambil ulang dari DB agar
   * penonaktifan akun & perubahan role berlaku seketika, tidak menunggu token kedaluwarsa.
   */
  async verifyAccessToken(accessToken: string): Promise<AuthUser> {
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(accessToken, {
        secret: this.config.accessSecret,
      });
    } catch {
      throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new AppException(ErrorCode.UNAUTHORIZED, SESSION_EXPIRED);
    }
    return toAuthUser(user);
  }

  private async issueTokens(db: Db, user: AuthUser): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, outletId: user.outletId } satisfies AccessPayload,
      { secret: this.config.accessSecret, expiresIn: this.config.accessExpiresIn },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() } satisfies RefreshPayload,
      { secret: this.config.refreshSecret, expiresIn: this.config.refreshExpiresIn },
    );
    const accessExpiresAt = this.expiryOf(accessToken);
    const refreshExpiresAt = this.expiryOf(refreshToken);

    await db.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt },
    });

    return {
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      csrfToken: randomBytes(32).toString('base64url'),
    };
  }

  private expiryOf(token: string): Date {
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return new Date(exp * 1000);
  }

  private lockedError(lockedUntil: Date) {
    return new AppException(
      ErrorCode.ACCOUNT_LOCKED,
      'Akun terkunci karena terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
      { lockedUntil: lockedUntil.toISOString() },
    );
  }
}
