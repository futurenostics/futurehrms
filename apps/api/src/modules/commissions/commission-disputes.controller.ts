import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  commissionDisputeCreateSchema,
  commissionDisputeListQuerySchema,
  commissionDisputeResolveSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { CommissionDisputesService } from './commission-disputes.service';

@Controller('commission-disputes')
export class CommissionDisputesController {
  constructor(private readonly disputes: CommissionDisputesService) {}

  /**
   * List disputes. `manage_disputes` sees all (filter by status / run);
   * everyone else is scoped to their own by the service, so the
   * endpoint itself only needs authentication.
   */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = commissionDisputeListQuerySchema.parse(rawQuery);
    return this.disputes.list(user, query);
  }

  /** Employee raises a dispute against one of their line items. */
  @Post()
  @RequirePermission('commissions:raise_dispute')
  async raise(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = commissionDisputeCreateSchema.parse(body);
    return this.disputes.raise(user, input);
  }

  /** HR resolves or rejects a dispute with a note. */
  @Patch(':id/resolve')
  @RequirePermission('commissions:manage_disputes')
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionDisputeResolveSchema.parse(body);
    return this.disputes.resolve(user, id, input);
  }
}
