import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  commissionLineItemAdjustSchema,
  commissionLineItemManualCreateSchema,
  commissionRunAnalyticsQuerySchema,
  commissionRunApproveSchema,
  commissionRunCreateSchema,
  commissionRunListQuerySchema,
  commissionRunRejectSchema,
  commissionRunsTrendQuerySchema,
  commissionRunSubmitSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { contentTypeFor, renderReport } from '../../core/reports/report-formats';
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

  /**
   * Cross-run trend (period-over-period). Declared before the `:id`
   * routes so the static `analytics/trend` path isn't shadowed by the
   * `:id` param matcher.
   */
  @Get('analytics/trend')
  @RequirePermission('commissions:view_runs')
  async trend(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = commissionRunsTrendQuerySchema.parse(rawQuery);
    return this.runs.runsTrend(user, query);
  }

  @Get(':id')
  @RequirePermission('commissions:view_runs')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.findOne(user, id);
  }

  /** Per-run rollups + top-earner leaderboard. */
  @Get(':id/analytics')
  @RequirePermission('commissions:view_runs')
  async analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = commissionRunAnalyticsQuerySchema.parse(rawQuery);
    return this.runs.runAnalytics(user, id, query);
  }

  /**
   * Export the run as CSV. Permission `view_runs` (not `export_run`)
   * because the design intent is "if you can see the run, you can
   * export it" — the frontend's separate `export_run`-gated button
   * is just convenience; the endpoint itself is gated on view.
   *
   * Filename pattern: `commission-run-{monthKey}-{status}.csv` so a
   * downloaded file is self-describing (e.g.
   * `commission-run-2026-04-approved.csv`).
   */
  @Get(':id/export')
  @RequirePermission('commissions:view_runs')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { filename, csv } = await this.runs.exportCsv(user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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

  /** Manually add a recipient the calc engine didn't generate (draft only). */
  @Post(':id/line-items')
  @RequirePermission('commissions:adjust_line_item')
  async addLineItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionLineItemManualCreateSchema.parse(body);
    return this.runs.addManualLineItem(user, id, input);
  }

  /** Remove a line item from a draft run. */
  @Delete(':id/line-items/:lineItemId')
  @RequirePermission('commissions:adjust_line_item')
  async removeLineItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
  ) {
    return this.runs.removeLineItem(user, id, lineItemId);
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

  /* ---------- Disbursement (Module 4) ---------- */

  @Post(':id/disburse')
  @RequirePermission('commissions:lock_run')
  async disburse(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.disburse(user, id);
  }

  @Post(':id/send-emails')
  @RequirePermission('commissions:lock_run')
  async sendEmails(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.runs.sendEmails(user, id);
  }

  /** Per-employee payslip PDF for the run. */
  @Get(':id/payslips.pdf')
  @RequirePermission('commissions:view_runs')
  async payslips(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { filename, data } = await this.runs.buildPayslipsReport(user, id);
    const pdf = await renderReport(data, 'pdf');
    res.setHeader('Content-Type', contentTypeFor('pdf'));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  }
}
