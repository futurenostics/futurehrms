import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { ApprovalsService } from './approvals.service';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'all']).optional(),
  type: z.string().optional(),
  for: z.enum(['me', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const approveSchema = z.object({
  /** Type-specific confirmation payload. For commission-run this carries `{ confirmationPhrase }`. */
  confirmationData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

const cancelSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @RequirePermission('approvals:view_own_inbox')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = listQuerySchema.parse(rawQuery);
    return this.approvals.list(user, query);
  }

  @Get('types')
  @RequirePermission('approvals:view_own_inbox')
  async listTypes() {
    return { items: this.approvals.listTypes() };
  }

  @Get(':id')
  @RequirePermission('approvals:view_own_inbox')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.approvals.findOne(user, id);
  }

  @Post(':id/approve')
  @RequirePermission('approvals:view_own_inbox')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = approveSchema.parse(body);
    return this.approvals.approve(user, id, input);
  }

  @Post(':id/reject')
  @RequirePermission('approvals:view_own_inbox')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = rejectSchema.parse(body);
    return this.approvals.reject(user, id, input);
  }

  @Post(':id/cancel')
  @RequirePermission('approvals:cancel_any')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = cancelSchema.parse(body);
    return this.approvals.cancel(user, id, input.reason);
  }
}
