import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { CommissionRunsService } from './commission-runs.service';

/**
 * Per-employee commission breakdowns. The two endpoints feed the
 * employee-profile "Commissions" sub-tab and the dashboard widgets:
 *
 *   GET /api/employees/:id/commission-breakdown?month=YYYY-MM
 *   GET /api/employees/:id/commission-trend?monthsBack=12
 *
 * Permission: self by default, view_all_breakdowns for HR/Finance.
 */
@Controller('employees')
export class EmployeeCommissionsController {
  constructor(private readonly runs: CommissionRunsService) {}

  @Get(':id/commission-breakdown')
  @RequirePermission('commissions:view_own_breakdown')
  async breakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
    @Query('month') month: string,
  ) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) {
      throw new Error('Invalid month — expected YYYY-MM');
    }
    return this.runs.employeeBreakdown(user, employeeId, month);
  }

  @Get(':id/commission-trend')
  @RequirePermission('commissions:view_own_breakdown')
  async trend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
    @Query('monthsBack') monthsBackRaw?: string,
  ) {
    const monthsBack = Math.max(1, Math.min(36, Number(monthsBackRaw ?? 12) || 12));
    return this.runs.employeeTrend(user, employeeId, monthsBack);
  }
}
