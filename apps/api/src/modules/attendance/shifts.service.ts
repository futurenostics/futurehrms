/**
 * Shifts — HR-managed work-schedule definitions.
 *
 * Shifts are never hard-deleted (ShiftAssignment and AttendanceRecord
 * both FK to them) — `deactivate` / `activate` toggle `isActive`
 * instead, the same pattern CustomNotificationType uses for its
 * archive flow.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Shift } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ShiftPublic {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: string;
  overtimeThresholdMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: string;
  overtimeThresholdMinutes: number;
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

@Injectable()
export class ShiftsService {
  constructor(private readonly audit: AuditService) {}

  async list(): Promise<ShiftPublic[]> {
    const rows = await prisma.shift.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toPublic);
  }

  async create(viewer: AuthenticatedUser, input: CreateShiftInput): Promise<ShiftPublic> {
    validateTimes(input.startTime, input.endTime);
    const row = await prisma.shift.create({ data: input });
    await this.audit.record({
      module: 'attendance',
      entity: 'Shift',
      entityId: row.id,
      action: 'created',
      after: { name: row.name, startTime: row.startTime, endTime: row.endTime },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: UpdateShiftInput,
  ): Promise<ShiftPublic> {
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    if (input.startTime || input.endTime) {
      validateTimes(input.startTime ?? existing.startTime, input.endTime ?? existing.endTime);
    }
    const row = await prisma.shift.update({ where: { id }, data: input });
    await this.audit.record({
      module: 'attendance',
      entity: 'Shift',
      entityId: row.id,
      action: 'updated',
      before: { name: existing.name, startTime: existing.startTime, endTime: existing.endTime },
      after: { name: row.name, startTime: row.startTime, endTime: row.endTime },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async setActive(viewer: AuthenticatedUser, id: string, isActive: boolean): Promise<ShiftPublic> {
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    if (existing.isActive === isActive) return toPublic(existing);
    const row = await prisma.shift.update({ where: { id }, data: { isActive } });
    await this.audit.record({
      module: 'attendance',
      entity: 'Shift',
      entityId: row.id,
      action: isActive ? 'activated' : 'deactivated',
      actorId: viewer.id,
    });
    return toPublic(row);
  }
}

function validateTimes(startTime: string, endTime: string): void {
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    throw new BadRequestException('startTime / endTime must be in HH:mm 24-hour format');
  }
}

function toPublic(row: Shift): ShiftPublic {
  return {
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    gracePeriodMinutes: row.gracePeriodMinutes,
    halfDayThresholdMinutes: row.halfDayThresholdMinutes,
    breakDurationMinutes: row.breakDurationMinutes,
    overtimeType: row.overtimeType,
    overtimeThresholdMinutes: row.overtimeThresholdMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
