import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { loginInputSchema } from '@futurenostics/types';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestContextService } from '../request-context/request-context.service';
import { AppConfigService } from '../../config/app.config';
import type { AuthenticatedUser } from './types';

const REFRESH_COOKIE = 'fn_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly context: RequestContextService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const parsed = loginInputSchema.parse(body);
    const ctx = this.context.get();
    const result = await this.auth.login(parsed.email, parsed.password, {
      ipAddress: ctx?.ipAddress ?? req.ip,
      userAgent: ctx?.userAgent ?? req.headers['user-agent'],
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token = this.readRefreshCookie(req);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const ctx = this.context.get();
    const result = await this.auth.refresh(token, {
      ipAddress: ctx?.ipAddress ?? req.ip,
      userAgent: ctx?.userAgent ?? req.headers['user-agent'],
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.readRefreshCookie(req);
    if (token) {
      await this.auth.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<{
    id: string;
    email: string;
    fullName: string | null;
    employeeId: string | null;
    permissions: string[];
    roles: string[];
  }> {
    const fresh = await this.auth.getCurrentUserPayload(user.id);
    if (!fresh) {
      throw new UnauthorizedException('User no longer active');
    }
    return fresh;
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }

  private cookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: string;
  } {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
    };
  }
}
