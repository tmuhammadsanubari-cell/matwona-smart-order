import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_COOKIE, ErrorCode } from 'shared';
import { AppException } from '../../../common/app.exception.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/auth.decorators.js';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator.js';
import { AuthService } from '../auth.service.js';

/**
 * Guard global: semua endpoint HTTP wajib login staf kecuali yang ditandai @Public().
 * Token dibaca dari cookie access; header `Authorization: Bearer` diterima untuk klien non-browser.
 * Socket.IO memvalidasi token sendiri saat handshake (S1-08).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = extractAccessToken(req);
    if (!token) {
      throw new AppException(ErrorCode.UNAUTHORIZED, 'Silakan login terlebih dahulu.');
    }
    (req as AuthenticatedRequest).user = await this.auth.verifyAccessToken(token);
    return true;
  }
}

export function extractAccessToken(req: Request): string | undefined {
  const fromCookie: unknown = req.cookies?.[AUTH_COOKIE.ACCESS];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;
  const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && value ? value : undefined;
}
