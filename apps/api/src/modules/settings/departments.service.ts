import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Department } from '@prisma/client';
import type {
  DepartmentCreateInput,
  DepartmentListQuery,
  DepartmentPublic,
  DepartmentUpdateInput,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { slugFromName, uniqueSlug } from './slug';

const DEPARTMENT_INCLUDE = {
  _count: { select: { employees: { where: { deletedAt: null } } } },
  head: { select: { id: true, fullName: true } },
} as const;

type DepartmentWithRelations = Department & {
  _count: { employees: number };
  head: { id: string; fullName: string } | null;
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly audit: AuditService) {}

  async list(query: DepartmentListQuery): Promise<{ items: DepartmentPublic[] }> {
    const rows = await prisma.department.findMany({
      where: query.includeHidden ? undefined : { deletedAt: null },
      orderBy: { name: 'asc' },
      include: DEPARTMENT_INCLUDE,
    });
    return { items: rows.map(toPublic) };
  }

  async create(viewer: AuthenticatedUser, input: DepartmentCreateInput): Promise<DepartmentPublic> {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const headEmployeeId = input.headEmployeeId ?? null;
    await this.assertNameAvailable(name);
    await this.assertValidHead(headEmployeeId);
    const slug = await uniqueSlug(slugFromName(name), async (candidate) => {
      const existing = await prisma.department.findUnique({ where: { slug: candidate } });
      return existing !== null;
    });

    const row = await prisma.department.create({
      data: { name, slug, description, headEmployeeId },
      include: DEPARTMENT_INCLUDE,
    });
    await this.audit.record({
      module: 'settings',
      entity: 'Department',
      entityId: row.id,
      action: 'created',
      after: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        headEmployeeId: row.headEmployeeId,
      },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: DepartmentUpdateInput,
  ): Promise<DepartmentPublic> {
    const existing = await this.requireLive(id);
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const headEmployeeId = input.headEmployeeId ?? null;
    const nameChanged = name.toLowerCase() !== existing.name.toLowerCase();

    if (nameChanged) {
      await this.assertNameAvailable(name, id);
    }
    if (headEmployeeId !== existing.headEmployeeId) {
      await this.assertValidHead(headEmployeeId);
    }
    const slug = nameChanged
      ? await uniqueSlug(slugFromName(name), async (candidate) => {
          const clash = await prisma.department.findUnique({ where: { slug: candidate } });
          return clash !== null && clash.id !== id;
        })
      : existing.slug;

    const row = await prisma.department.update({
      where: { id },
      data: { name, slug, description, headEmployeeId },
      include: DEPARTMENT_INCLUDE,
    });
    await this.audit.record({
      module: 'settings',
      entity: 'Department',
      entityId: row.id,
      action: 'updated',
      before: {
        name: existing.name,
        slug: existing.slug,
        description: existing.description,
        headEmployeeId: existing.headEmployeeId,
      },
      after: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        headEmployeeId: row.headEmployeeId,
      },
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  async hide(viewer: AuthenticatedUser, id: string): Promise<{ id: string }> {
    const existing = await this.requireLive(id);
    const employeeCount = await prisma.employee.count({
      where: { departmentId: id, deletedAt: null },
    });
    if (employeeCount > 0) {
      throw new ConflictException({
        code: 'DEPARTMENT_IN_USE',
        employeeCount,
        message: `${existing.name} still has ${employeeCount} employee(s). Move them to another department before hiding it.`,
      });
    }

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record({
      module: 'settings',
      entity: 'Department',
      entityId: id,
      action: 'hidden',
      before: { deletedAt: null },
      after: { deletedAt: new Date().toISOString() },
      actorId: viewer.id,
    });
    return { id };
  }

  async restore(viewer: AuthenticatedUser, id: string): Promise<DepartmentPublic> {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');
    if (!existing.deletedAt) {
      throw new ConflictException({
        code: 'DEPARTMENT_NOT_HIDDEN',
        message: `${existing.name} is not hidden.`,
      });
    }

    const clash = await prisma.department.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        name: { equals: existing.name, mode: 'insensitive' },
      },
    });
    if (clash) {
      throw new ConflictException({
        code: 'DEPARTMENT_EXISTS',
        message: `Another department named "${existing.name}" already exists.`,
      });
    }

    const row = await prisma.department.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
      include: DEPARTMENT_INCLUDE,
    });
    await this.audit.record({
      module: 'settings',
      entity: 'Department',
      entityId: row.id,
      action: 'restored',
      actorId: viewer.id,
    });
    return toPublic(row);
  }

  /** Fetches the row, treating a hidden department as not-found. */
  private async requireLive(id: string): Promise<Department> {
    const row = await prisma.department.findUnique({ where: { id } });
    if (!row || row.deletedAt) throw new NotFoundException('Department not found');
    return row;
  }

  /**
   * Throws `DEPARTMENT_HIDDEN` (with the hidden row's id) when the name
   * clashes with a soft-deleted department — the frontend routes that
   * into a restore-confirm dialog instead of creating a duplicate.
   * Throws a plain `DEPARTMENT_EXISTS` when it clashes with a live one.
   */
  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const clash = await prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (!clash) return;
    if (clash.deletedAt) {
      throw new ConflictException({
        code: 'DEPARTMENT_HIDDEN',
        hiddenId: clash.id,
        message: `"${name}" is hidden. Restore it instead of creating a duplicate.`,
      });
    }
    throw new ConflictException({
      code: 'DEPARTMENT_EXISTS',
      message: `A department named "${name}" already exists.`,
    });
  }

  /** A department head must be a real, currently-active employee. */
  private async assertValidHead(headEmployeeId: string | null): Promise<void> {
    if (!headEmployeeId) return;
    const employee = await prisma.employee.findUnique({ where: { id: headEmployeeId } });
    if (!employee || employee.deletedAt) {
      throw new BadRequestException('The selected department head is not a valid employee.');
    }
  }
}

function toPublic(row: DepartmentWithRelations): DepartmentPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    employeeCount: row._count.employees,
    head: row.head,
    hiddenAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
