import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from 'shared';

/** Request staf yang sudah lolos JwtAuthGuard. */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/** Staf yang sedang login. Hanya untuk endpoint yang tidak @Public(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
