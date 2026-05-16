import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokensService } from '../tokens.service';
import { AuthService } from '../auth.service';
import { RequestContextService } from '../../request-context/request-context.service';

/**
 * Validates bearer tokens and resolves the user.
 *
 * Wired as a global guard in `app.module.ts`, so every endpoint is
 * authenticated by default. Use `@Public()` to opt out (login, refresh,
 * logout, health).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly auth: AuthService,
    private readonly context: RequestContextService,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = executionContext.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    let payload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.auth.resolveUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer active');
    }

    (req as Request & { user: typeof user }).user = user;
    this.context.set({ actorId: user.id });
    return true;
  }
}
