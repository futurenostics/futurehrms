import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Marks a controller method as not requiring authentication.
 *
 * Use sparingly — typically for `/auth/login`, `/auth/refresh`, and
 * `/health`. Everything else is gated by the global `JwtAuthGuard`.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
