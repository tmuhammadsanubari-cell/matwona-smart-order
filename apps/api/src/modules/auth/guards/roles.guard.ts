import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, UserRole } from 'shared';
import { AppException } from '../../../common/app.exception.js';
import { ROLES_KEY } from '../../../common/decorators/auth.decorators.js';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator.js';

/** Guard global setelah JwtAuthGuard: tolak 403 jika role staf tidak ada di @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (ctx.getType() !== 'http') return true;
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;

    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, 'Silakan login terlebih dahulu.');
    }
    if (!roles.includes(user.role)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Anda tidak punya akses ke halaman ini.');
    }
    return true;
  }
}
