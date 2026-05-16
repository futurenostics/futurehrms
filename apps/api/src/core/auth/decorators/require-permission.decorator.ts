import { SetMetadata } from '@nestjs/common';

export const PERMISSION_METADATA_KEY = 'auth:requiredPermissions';

/**
 * Declares one or more permission keys the caller must hold for this
 * route. Permissions stack — all listed keys must be present.
 *
 *   @RequirePermission('commissions:approve')
 *   @RequirePermission('commissions:approve', 'commissions:disburse')
 */
export const RequirePermission = (...keys: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, keys);
