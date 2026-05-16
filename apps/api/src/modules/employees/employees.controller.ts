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
  employeeListQuerySchema,
  employeeUpdateSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { StorageService } from '../../core/storage/storage.service';
import { EmployeesService } from './employees.service';
import { buildCsv, commitCsv, validateCsv } from './employees.csv';

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

  @Get('total')
  @RequirePermission('employees:view_all')
  async total(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.totalActiveCount(user);
  }

  @Get('org-chart')
  @RequirePermission('employees:view_team')
  async orgChart(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.orgChart(user);
  }

  @Get('export')
  @RequirePermission('employees:export')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
    @Res({ passthrough: false }) res: Response,
  ) {
    const query = employeeListQuerySchema.parse({ ...rawQuery, pageSize: 10_000 });
    const rows = await this.employees.exportRowsForCsv(user, query);
    const includeSalary = user.permissions.includes('employees:view_salary');
    const csv = buildCsv(rows, includeSalary);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
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
