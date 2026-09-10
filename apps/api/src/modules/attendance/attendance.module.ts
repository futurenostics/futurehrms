import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { attendanceManifest } from './attendance.manifest';
import { AttendanceController } from './attendance.controller';
import { ShiftsService } from './shifts.service';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { HolidaysService } from './holidays.service';

/**
 * Attendance module.
 *
 * This phase ships Shift + ShiftAssignment config CRUD. Punch capture,
 * the rule engine, and the correction-request approval-type
 * registration land next (see the docstring in attendance.manifest.ts
 * for the full phasing).
 */
@Module({
  controllers: [AttendanceController],
  providers: [ShiftsService, ShiftAssignmentsService, HolidaysService],
})
export class AttendanceModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(attendanceManifest);
  }
}
