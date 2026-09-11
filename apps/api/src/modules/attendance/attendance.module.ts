import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { attendanceManifest } from './attendance.manifest';
import { AttendanceController } from './attendance.controller';
import { ShiftsService } from './shifts.service';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { HolidaysService } from './holidays.service';
import { PunchesService } from './punches.service';

/**
 * Attendance module.
 *
 * This phase adds punch capture + the rule engine on top of the
 * config CRUD (Shift/ShiftAssignment/Holiday/AttendancePolicy). The
 * correction-request approval-type registration is still next (see
 * the docstring in attendance.manifest.ts for the full phasing).
 */
@Module({
  controllers: [AttendanceController],
  providers: [ShiftsService, ShiftAssignmentsService, HolidaysService, PunchesService],
})
export class AttendanceModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(attendanceManifest);
  }
}
