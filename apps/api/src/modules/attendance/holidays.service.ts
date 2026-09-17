/**
 * Holidays — HR-managed dates the (not-yet-built) rule engine will
 * classify as 'holiday' rather than 'absent'. Simple, global list for
 * now — no per-department calendars, no recurrence rule.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Holiday } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';

export interface HolidayPublic {
  id: string;
  date: string;
  name: string;
  createdAt: string;
}

export interface CreateHolidayInput {
  date: Date;
  name: string;
}

export interface UpdateHolidayInput {
  date?: Date;
  name?: string;
}

export interface ListHolidaysQuery {
  from?: Date;
  to?: Date;
}

@Injectable()
export class HolidaysService {
  constructor(private readonly audit: AuditService) {}

  async list(query: ListHolidaysQuery): Promise<HolidayPublic[]> {
    const rows = await prisma.holiday.findMany({
      where: {
        date: {
          gte: query.from,
          lte: query.to,
        },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map(toPublic);
  }

  async create(viewer: AuthenticatedUser, input: CreateHolidayInput): Promise<HolidayPublic> {
    const existing = await prisma.holiday.findUnique({ where: { date: input.date } });
    if (existing) {
      throw new BadRequestException(
        `A holiday is already recorded for ${input.date.toDateString()}`,
      );
    }
    const row = await prisma.holiday.create({ data: input });
    await this.audit.record({
      module: 'attendance',
      entity: 'Holiday',
      entityId: row.id,
      action: 'created',
      after: { date: row.date, name: row.name },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: UpdateHolidayInput,
  ): Promise<HolidayPublic> {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Holiday not found');
    if (input.date) {
      const clash = await prisma.holiday.findUnique({ where: { date: input.date } });
      if (clash && clash.id !== id) {
        throw new BadRequestException(
          `A holiday is already recorded for ${input.date.toDateString()}`,
        );
      }
    }
    const row = await prisma.holiday.update({ where: { id }, data: input });
    await this.audit.record({
      module: 'attendance',
      entity: 'Holiday',
      entityId: row.id,
      action: 'updated',
      before: { date: existing.date, name: existing.name },
      after: { date: row.date, name: row.name },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async remove(viewer: AuthenticatedUser, id: string): Promise<{ id: string }> {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Holiday not found');
    await prisma.holiday.delete({ where: { id } });
    await this.audit.record({
      module: 'attendance',
      entity: 'Holiday',
      entityId: id,
      action: 'deleted',
      before: { date: existing.date, name: existing.name },
      actorId: viewer.id,
    });
    return { id };
  }
}

function toPublic(row: Holiday): HolidayPublic {
  return {
    id: row.id,
    date: row.date.toISOString(),
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}
