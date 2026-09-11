import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { ShiftsService } from './shifts.service';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { HolidaysService } from './holidays.service';
import { PunchesService } from './punches.service';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:mm 24-hour format');

const shiftCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startTime: timeSchema,
  endTime: timeSchema,
  gracePeriodMinutes: z.number().int().min(0).max(240).default(15),
  halfDayThresholdMinutes: z.number().int().min(0).max(600).default(120),
  breakDurationMinutes: z.number().int().min(0).max(240).default(0),
  overtimeType: z.enum(['auto', 'approval_based']).default('auto'),
  overtimeThresholdMinutes: z.number().int().min(0).max(240).default(30),
});

const shiftUpdateSchema = shiftCreateSchema.partial();

const shiftActiveSchema = z.object({ isActive: z.boolean() });

const shiftAssignmentCreateSchema = z
  .object({
    employeeId: z.string().min(1).nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
    shiftId: z.string().min(1),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime().nullable().optional(),
    priority: z.number().int().min(0).max(100).optional(),
  })
  .refine((v) => (v.employeeId ? 1 : 0) + (v.departmentId ? 1 : 0) === 1, {
    message: 'Exactly one of employeeId or departmentId is required',
  });

const shiftAssignmentUpdateSchema = z.object({
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

const listShiftAssignmentsQuerySchema = z.object({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
});

const holidayCreateSchema = z.object({
  date: z.string().datetime(),
  name: z.string().trim().min(1).max(160),
});

const holidayUpdateSchema = holidayCreateSchema.partial();

const listHolidaysQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const punchSchema = z.object({
  punchType: z.enum(['in', 'out']),
  // 'mobile' | 'biometric' | 'geo_fence' are reserved for when those
  // clients exist — this endpoint only accepts web/manual for now.
  source: z.enum(['web', 'manual']).optional(),
});

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly shifts: ShiftsService,
    private readonly shiftAssignments: ShiftAssignmentsService,
    private readonly holidays: HolidaysService,
    private readonly punches: PunchesService,
  ) {}

  /* ---------- Punch capture ---------- */

  @Get('today')
  @RequirePermission('attendance:punch')
  async today(@CurrentUser() user: AuthenticatedUser) {
    return { record: await this.punches.getToday(user) };
  }

  @Post('punch')
  @RequirePermission('attendance:punch')
  async punch(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = punchSchema.parse(body);
    return this.punches.punch(user, input);
  }

  /* ---------- Shifts ---------- */

  @Get('shifts')
  @RequirePermission('attendance:manage_shifts')
  async listShifts() {
    return { items: await this.shifts.list() };
  }

  @Post('shifts')
  @RequirePermission('attendance:manage_shifts')
  async createShift(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = shiftCreateSchema.parse(body);
    return this.shifts.create(user, input);
  }

  @Patch('shifts/:id')
  @RequirePermission('attendance:manage_shifts')
  async updateShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = shiftUpdateSchema.parse(body);
    return this.shifts.update(user, id, input);
  }

  @Patch('shifts/:id/active')
  @RequirePermission('attendance:manage_shifts')
  async setShiftActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { isActive } = shiftActiveSchema.parse(body);
    return this.shifts.setActive(user, id, isActive);
  }

  /* ---------- Shift assignments ---------- */

  @Get('shift-assignments')
  @RequirePermission('attendance:manage_shifts')
  async listShiftAssignments(@Query() rawQuery: Record<string, unknown>) {
    const query = listShiftAssignmentsQuerySchema.parse(rawQuery);
    return { items: await this.shiftAssignments.list(query) };
  }

  @Post('shift-assignments')
  @RequirePermission('attendance:manage_shifts')
  async createShiftAssignment(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = shiftAssignmentCreateSchema.parse(body);
    return this.shiftAssignments.create(user, {
      employeeId: input.employeeId ?? null,
      departmentId: input.departmentId ?? null,
      shiftId: input.shiftId,
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : null,
      priority: input.priority,
    });
  }

  @Patch('shift-assignments/:id')
  @RequirePermission('attendance:manage_shifts')
  async updateShiftAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = shiftAssignmentUpdateSchema.parse(body);
    return this.shiftAssignments.update(user, id, {
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validTo:
        input.validTo === undefined ? undefined : input.validTo ? new Date(input.validTo) : null,
      priority: input.priority,
    });
  }

  @Delete('shift-assignments/:id')
  @RequirePermission('attendance:manage_shifts')
  async deleteShiftAssignment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shiftAssignments.remove(user, id);
  }

  /* ---------- Holidays ---------- */

  @Get('holidays')
  @RequirePermission('attendance:manage_policies')
  async listHolidays(@Query() rawQuery: Record<string, unknown>) {
    const query = listHolidaysQuerySchema.parse(rawQuery);
    return {
      items: await this.holidays.list({
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      }),
    };
  }

  @Post('holidays')
  @RequirePermission('attendance:manage_policies')
  async createHoliday(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = holidayCreateSchema.parse(body);
    return this.holidays.create(user, { date: new Date(input.date), name: input.name });
  }

  @Patch('holidays/:id')
  @RequirePermission('attendance:manage_policies')
  async updateHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = holidayUpdateSchema.parse(body);
    return this.holidays.update(user, id, {
      date: input.date ? new Date(input.date) : undefined,
      name: input.name,
    });
  }

  @Delete('holidays/:id')
  @RequirePermission('attendance:manage_policies')
  async deleteHoliday(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.holidays.remove(user, id);
  }
}
