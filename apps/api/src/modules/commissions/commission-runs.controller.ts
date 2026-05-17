import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  commissionLineItemAdjustSchema,
  commissionRunApproveSchema,
  commissionRunCreateSchema,
  commissionRunListQuerySchema,
  commissionRunRejectSchema,
  commissionRunSubmitSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { CommissionRunsService } from './commission-runs.service';

@Controller('commission-runs')
export class CommissionRunsController {
  constructor(private readonly runs: CommissionRunsService) {}

  @Get()
  @RequirePermission('commissions:view_runs')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = commissionRunListQuerySchema.parse(rawQuery);
    return this.runs.list(user, query);
  }

  @Get(':id')
  @RequirePermission('commissions:view_runs')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.findOne(user, id);
  }

  @Get(':id/export')
  @RequirePermission('commissions:export_run')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const csv = await this.runs.exportCsv(user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="commission-run-${id}.csv"`);
    res.send(csv);
  }

  @Post()
  @RequirePermission('commissions:create_run')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = commissionRunCreateSchema.parse(body);
    return this.runs.create(user, input);
  }

  @Post(':id/recalculate')
  @RequirePermission('commissions:create_run')
  async recalculate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.recalculate(user, id);
  }

  @Patch(':id/line-items/:lineItemId')
  @RequirePermission('commissions:adjust_line_item')
  async adjustLineItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @Body() body: unknown,
  ) {
    const input = commissionLineItemAdjustSchema.parse(body);
    return this.runs.adjustLineItem(user, id, lineItemId, input);
  }

  @Post(':id/submit')
  @RequirePermission('commissions:submit_run')
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionRunSubmitSchema.parse(body);
    return this.runs.submitForApproval(user, id, input);
  }

  @Post(':id/approve')
  @RequirePermission('commissions:approve_run')
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionRunApproveSchema.parse(body);
    return this.runs.approve(user, id, input);
  }

  @Post(':id/reject')
  @RequirePermission('commissions:reject_run')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionRunRejectSchema.parse(body);
    return this.runs.reject(user, id, input);
  }

  @Post(':id/lock')
  @RequirePermission('commissions:lock_run')
  async lock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.lock(user, id);
  }

  @Post(':id/reopen')
  @RequirePermission('commissions:create_run')
  async reopen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.reopenRejected(user, id);
  }
}
