import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSION_METADATA_KEY } from '../decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../types';

/**
 * Enforces declarative permission requirements.
 *
 * Wired as a global guard after `JwtAuthGuard` so it sees the resolved
 * `request.user`. Routes without `@RequirePermission(...)` metadata are
 * left alone — authentication is sufficient for those.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(executionContext: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_METADATA_KEY, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = executionContext
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const owned = new Set(user.permissions);
    const missing = required.filter((key) => !owned.has(key));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required permission${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
