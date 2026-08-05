import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  changeManagerSchema,
  changeSalarySchema,
  changeStatusSchema,
  employeeCreateSchema,
  employeeFilterCountsQuerySchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  moveToNoticeSchema,
  terminateEmployeeSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { StorageService } from '../../core/storage/storage.service';
import { EmployeesService } from './employees.service';
import { commitCsv, employeeReportData, validateCsv } from './employees.csv';
import {
  contentTypeFor,
  extensionFor,
  renderReport,
  type ReportFormat,
} from '../../core/reports/report-formats';

const REPORT_FORMATS = new Set<ReportFormat>(['csv', 'xlsx', 'pdf']);
function parseReportFormat(raw: unknown): ReportFormat {
  return typeof raw === 'string' && REPORT_FORMATS.has(raw as ReportFormat)
    ? (raw as ReportFormat)
    : 'csv';
}

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CSV_MAX_BYTES = 5 * 1024 * 1024;

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly storage: StorageService,
  ) {}

  /* ---------- Reads ---------- */

  @Get()
  @RequirePermission('employees:view_team')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = employeeListQuerySchema.parse(rawQuery);
    return this.employees.list(user, query);
  }

  @Get('references')
  @RequirePermission('employees:view_team')
  async references() {
    return this.employees.references();
  }

  /**
   * Powers the Advanced Filters drawer — returns the matched total
   * plus per-option counts under the current filter state. The
   * frontend debounces this around 250ms and uses it for the live
   * footer count + zero-result option dimming + salary histogram.
   */
  @Get('filter-counts')
  @RequirePermission('employees:view_team')
  async filterCounts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = employeeFilterCountsQuerySchema.parse(rawQuery);
    return this.employees.getFilterCounts(user, query);
  }

  @Get('total')
  @RequirePermission('employees:view_all')
  async total(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.totalActiveCount(user);
  }

  @Get('stats')
  @RequirePermission('employees:view_team')
  async stats(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.stats(user);
  }

  @Get('org-chart')
  @RequirePermission('employees:view_team')
  async orgChart(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.orgChart(user);
  }

  @Get('export')
  @RequirePermission('employees:export')
  async exportEmployees(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
    @Res({ passthrough: false }) res: Response,
  ) {
    const format = parseReportFormat(rawQuery.format);
    const query = employeeListQuerySchema.parse({ ...rawQuery, offset: 0, limit: 10_000 });
    const rows = await this.employees.exportRowsForCsv(user, query);
    const includeSalary = user.permissions.includes('employees:view_salary');
    const report = employeeReportData(rows, includeSalary, new Date());
    const buffer = await renderReport(report, format);

    const filename = `employees-${new Date().toISOString().slice(0, 10)}.${extensionFor(format)}`;
    res.setHeader('Content-Type', contentTypeFor(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Single-record reads don't carry a @RequirePermission — any
   * authenticated user can hit them, and the service's
   * `assertEmployeeReadable` decides whether the row is in scope. That
   * way a user with only `employees:view_own` reaches their own profile
   * but no one else's, without the controller branching on permission
   * keys.
   */
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employees.findOne(user, id);
  }

  @Get(':id/salary-history')
  @RequirePermission('employees:view_salary')
  async salaryHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employees.listSalaryHistory(user, id);
  }

  @Get(':id/timeline')
  async timeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employees.listTimeline(user, id);
  }

  @Get(':id/assigned-projects')
  async assignedProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('scope') scope?: string,
  ) {
    return this.employees.assignedProjects(user, id, scope === 'all' ? 'all' : 'active');
  }

  /* ---------- Writes ---------- */

  @Post()
  @RequirePermission('employees:create')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = employeeCreateSchema.parse(body);
    return this.employees.create(user, input);
  }

  @Patch(':id')
  @RequirePermission('employees:update')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = employeeUpdateSchema.parse(body);
    return this.employees.update(user, id, input);
  }

  @Delete(':id')
  @RequirePermission('employees:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.employees.softDelete(user, id);
  }

  @Post(':id/change-status')
  @RequirePermission('employees:change_status')
  async changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = changeStatusSchema.parse(body);
    return this.employees.changeStatus(user, id, input);
  }

  @Post(':id/change-manager')
  @RequirePermission('employees:change_manager')
  async changeManager(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = changeManagerSchema.parse(body);
    return this.employees.changeManager(user, id, input);
  }

  @Post(':id/change-salary')
  @RequirePermission('employees:change_salary')
  async changeSalary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = changeSalarySchema.parse(body);
    return this.employees.changeSalary(user, id, input);
  }

  @Post(':id/move-to-notice')
  @RequirePermission('employees:update')
  async moveToNotice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = moveToNoticeSchema.parse(body);
    return this.employees.moveToNotice(user, id, input);
  }

  @Post(':id/terminate')
  @RequirePermission('employees:delete')
  async terminate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = terminateEmployeeSchema.parse(body);
    return this.employees.terminate(user, id, input);
  }

  /* ---------- Photo ---------- */

  @Post(':id/photo')
  @RequirePermission('employees:update')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: PHOTO_MAX_BYTES } }))
  async uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!PHOTO_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type ${file.mimetype}. Use JPEG, PNG, or WebP.`,
      );
    }

    const ext = pickExtension(file.mimetype);
    const photoId = randomUUID();
    const key = `employee/${id}/photo/${photoId}.${ext}`;

    await this.storage.putObject({
      bucket: 'documents',
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return this.employees.recordPhotoUpload(user, id, { storageKey: key });
  }

  /* ---------- CSV import ---------- */

  @Post('import/preview')
  @RequirePermission('employees:import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_BYTES } }))
  async importPreview(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file uploaded');
    const result = await validateCsv(file.buffer);
    return result.preview;
  }

  @Post('import')
  @RequirePermission('employees:import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_BYTES } }))
  async importCommit(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file uploaded');
    return commitCsv(file.buffer);
  }
}

function pickExtension(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      throw new NotFoundException(`Unknown mime ${mime}`);
  }
}
