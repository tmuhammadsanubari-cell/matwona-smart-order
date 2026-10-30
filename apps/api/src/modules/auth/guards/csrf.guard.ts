import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_COOKIE, CSRF_HEADER, ErrorCode } from 'shared';
import { AppException } from '../../../common/app.exception.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/auth.decorators.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie (PRD 4.4): request staf yang mengubah data dan memakai cookie sesi
 * wajib mengirim header X-CSRF-Token yang sama dengan cookie CSRF.
 * Klien dengan `Authorization: Bearer` (tanpa cookie) tidak rentan CSRF sehingga dilewati.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic || !req.cookies?.[AUTH_COOKIE.ACCESS]) return true;

    const cookie: unknown = req.cookies[AUTH_COOKIE.CSRF];
    const header = req.headers[CSRF_HEADER];
    if (typeof cookie !== 'string' || typeof header !== 'string' || !safeEqual(cookie, header)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length > 0 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
