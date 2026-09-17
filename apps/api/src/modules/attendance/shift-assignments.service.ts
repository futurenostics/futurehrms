/**
 * ShiftAssignments — which employee or department uses which Shift,
 * over what date range.
 *
 * `assignmentType` is derived from whichever of employeeId/departmentId
 * is set, not taken from client input — avoids a client sending a type
 * that doesn't match the id it actually supplied.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { ShiftAssignment } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';

export interface ShiftAssignmentPublic {
  id: string;
  employeeId: string | null;
  departmentId: string | null;
  shiftId: string;
  validFrom: string;
  validTo: string | null;
  assignmentType: string;
  priority: number;
  createdAt: string;
}

export interface CreateShiftAssignmentInput {
  employeeId?: string | null;
  departmentId?: string | null;
  shiftId: string;
  validFrom: Date;
  validTo?: Date | null;
  priority?: number;
}

export interface UpdateShiftAssignmentInput {
  validFrom?: Date;
  validTo?: Date | null;
  priority?: number;
}

export interface ListShiftAssignmentsQuery {
  employeeId?: string;
  departmentId?: string;
}

@Injectable()
export class ShiftAssignmentsService {
  constructor(private readonly audit: AuditService) {}

  async list(query: ListShiftAssignmentsQuery): Promise<ShiftAssignmentPublic[]> {
    const rows = await prisma.shiftAssignment.findMany({
      where: {
        employeeId: query.employeeId,
        departmentId: query.departmentId,
      },
      orderBy: [{ priority: 'desc' }, { validFrom: 'desc' }],
    });
    return rows.map(toPublic);
  }

  async create(
    viewer: AuthenticatedUser,
    input: CreateShiftAssignmentInput,
  ): Promise<ShiftAssignmentPublic> {
    const hasEmployee = !!input.employeeId;
    const hasDepartment = !!input.departmentId;
    if (hasEmployee === hasDepartment) {
      throw new BadRequestException('Exactly one of employeeId or departmentId is required');
    }
    if (input.validTo && input.validTo <= input.validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (hasEmployee) {
      const employee = await prisma.employee.findUnique({ where: { id: input.employeeId! } });
      if (!employee) throw new NotFoundException('Employee not found');
    } else {
      const department = await prisma.department.findUnique({ where: { id: input.departmentId! } });
      if (!department) throw new NotFoundException('Department not found');
    }

    const row = await prisma.shiftAssignment.create({
      data: {
        employeeId: input.employeeId ?? null,
        departmentId: input.departmentId ?? null,
        shiftId: input.shiftId,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
        assignmentType: hasEmployee ? 'individual' : 'department',
        priority: input.priority ?? (hasEmployee ? 10 : 0),
      },
    });
    await this.audit.record({
      module: 'attendance',
      entity: 'ShiftAssignment',
      entityId: row.id,
      action: 'created',
      after: {
        employeeId: row.employeeId,
        departmentId: row.departmentId,
        shiftId: row.shiftId,
        validFrom: row.validFrom,
        validTo: row.validTo,
      },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: UpdateShiftAssignmentInput,
  ): Promise<ShiftAssignmentPublic> {
    const existing = await prisma.shiftAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift assignment not found');
    const validFrom = input.validFrom ?? existing.validFrom;
    const validTo = input.validTo === undefined ? existing.validTo : input.validTo;
    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }
    const row = await prisma.shiftAssignment.update({
      where: { id },
      data: {
        validFrom: input.validFrom,
        validTo: input.validTo,
        priority: input.priority,
      },
    });
    await this.audit.record({
      module: 'attendance',
      entity: 'ShiftAssignment',
      entityId: row.id,
      action: 'updated',
      before: { validFrom: existing.validFrom, validTo: existing.validTo },
      after: { validFrom: row.validFrom, validTo: row.validTo },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async remove(viewer: AuthenticatedUser, id: string): Promise<{ id: string }> {
    const existing = await prisma.shiftAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift assignment not found');
    await prisma.shiftAssignment.delete({ where: { id } });
    await this.audit.record({
      module: 'attendance',
      entity: 'ShiftAssignment',
      entityId: id,
      action: 'deleted',
      before: { employeeId: existing.employeeId, departmentId: existing.departmentId },
      actorId: viewer.id,
    });
    return { id };
  }
}

function toPublic(row: ShiftAssignment): ShiftAssignmentPublic {
  return {
    id: row.id,
    employeeId: row.employeeId,
    departmentId: row.departmentId,
    shiftId: row.shiftId,
    validFrom: row.validFrom.toISOString(),
    validTo: row.validTo?.toISOString() ?? null,
    assignmentType: row.assignmentType,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
  };
}
