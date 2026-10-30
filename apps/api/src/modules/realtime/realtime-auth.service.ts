import { Inject, Injectable } from '@nestjs/common';
import { AUTH_COOKIE, ErrorCode, socketRoom } from 'shared';
import type { RealtimeHandshakeAuth } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ORDER_CODE_PATTERN } from '../orders/order-code.js';
import { TablesService } from '../tables/tables.service.js';

/** Bagian handshake Socket.IO yang dibutuhkan untuk autentikasi. */
export interface HandshakeLike {
  headers: { cookie?: string };
  auth?: unknown;
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const asString = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * Menentukan room yang boleh diikuti sebuah koneksi (PRD 2.2.4, 2.2.5):
 * - staf (cookie `mtw_access` atau `auth.token`) → `outlet:<id>:cashier`
 * - pelanggan (`auth.tableToken` + `auth.orderCode` yang cocok) → `order:<code>`
 * Selain itu ditolak dengan UNAUTHORIZED.
 */
@Injectable()
export class RealtimeAuthService {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(TablesService) private readonly tables: TablesService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async authorize(handshake: HandshakeLike): Promise<string[]> {
    const data = (handshake.auth ?? {}) as RealtimeHandshakeAuth;

    const accessToken = readCookie(handshake.headers.cookie, AUTH_COOKIE.ACCESS) ?? asString(data.token);
    if (accessToken) {
      const user = await this.auth.verifyAccessToken(accessToken);
      return [socketRoom.cashier(user.outletId)];
    }

    const tableToken = asString(data.tableToken);
    const orderCode = asString(data.orderCode);
    if (tableToken && orderCode) {
      const { table } = await this.tables.resolveToken(tableToken);
      const order = ORDER_CODE_PATTERN.test(orderCode)
        ? await this.prisma.order.findFirst({ where: { orderCode, tableId: table.id }, select: { id: true } })
        : null;
      if (!order) throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');
      return [socketRoom.order(orderCode)];
    }

    throw new AppException(ErrorCode.UNAUTHORIZED, 'Silakan login atau buka dari QR meja.');
  }
}
