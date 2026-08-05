/**
 * Reports controller (Module 5).
 *
 *   GET /reports                 → catalog (filtered by permission)
 *   GET /reports/:key/download   → render + stream a report file
 *
 * The download endpoint takes filters as query params; `employeeIds`
 * arrives comma-joined and is split here.
 */
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { reportDownloadQuerySchema, type ReportFilters } from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @RequirePermission('reports:view')
  catalog(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.catalog(user);
  }

  @Get(':key/download')
  @RequirePermission('reports:view')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Query() rawQuery: Record<string, unknown>,
    @Res({ passthrough: false }) res: Response,
  ) {
    const q = reportDownloadQuerySchema.parse(rawQuery);
    const filters: ReportFilters = {
      monthKey: q.monthKey,
      year: q.year,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      employeeIds: q.employeeIds ? q.employeeIds.split(',').filter(Boolean) : undefined,
      department: q.department,
      category: q.category,
      projectStatus: q.projectStatus,
    };

    const { filename, contentType, buffer } = await this.reports.generate(
      user,
      key,
      filters,
      q.format,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
