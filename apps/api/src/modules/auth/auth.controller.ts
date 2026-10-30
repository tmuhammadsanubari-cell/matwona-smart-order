import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_COOKIE, loginSchema } from 'shared';
import type { ApiSuccess, AuthSession, AuthUser, LoginInput } from 'shared';
import { Public } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AUTH_CONFIG } from './auth.config.js';
import type { AuthConfig } from './auth.config.js';
import { clearAuthCookies, setAuthCookies } from './auth.cookies.js';
import { AuthService } from './auth.service.js';
import type { AuthResult } from './auth.service.js';

const toSession = ({ user, csrfToken }: AuthResult): AuthSession => ({ user, csrfToken });

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccess<AuthSession>> {
    const result = await this.auth.login(body);
    setAuthCookies(res, result, this.config);
    return { success: true, data: toSession(result) };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccess<AuthSession>> {
    try {
      const result = await this.auth.refresh(req.cookies?.[AUTH_COOKIE.REFRESH]);
      setAuthCookies(res, result, this.config);
      return { success: true, data: toSession(result) };
    } catch (error) {
      clearAuthCookies(res, this.config);
      throw error;
    }
  }

  /** Publik agar logout tetap bisa membersihkan sesi walau access token sudah kedaluwarsa. */
  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<ApiSuccess<null>> {
    await this.auth.logout(req.cookies?.[AUTH_COOKIE.REFRESH]);
    clearAuthCookies(res, this.config);
    return { success: true, data: null };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): ApiSuccess<AuthUser> {
    return { success: true, data: user };
  }
}
