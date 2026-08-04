/**
 * Project → ProjectPublic mapper.
 *
 * Manual mapping (not class-transformer) so we have one place where
 * the API response shape is decided. The shape mirrors
 * `projectPublicSchema` in `@futurenostics/types`.
 */
import { Prisma } from '@prisma/client';
import type {
  ProjectAssignmentPublic,
  ProjectCategoryPublic,
  ProjectCategoryTreeNode,
  ProjectPublic,
  ProjectStatus,
} from '@futurenostics/types';

export const PROJECT_PUBLIC_INCLUDE = {
  category: true,
  department: true,
  commissionRule: true,
  assignments: {
    where: { removedAt: null },
    include: {
      employee: {
        include: {
          department: true,
          designation: true,
          documents: { where: { kind: 'photo' } },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectRowForMapping = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_PUBLIC_INCLUDE;
}>;

export function toProjectAssignmentPublic(
  row: ProjectRowForMapping['assignments'][number],
): ProjectAssignmentPublic {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employee: {
      id: row.employee.id,
      fullName: row.employee.fullName,
      eid: row.employee.eid,
      photoUrl: null,
      departmentName: row.employee.department?.name ?? null,
      designationName: row.employee.designation?.name ?? null,
    },
    roleName: row.roleName,
    percentage: Number(row.percentage),
    assignedAt: row.assignedAt.toISOString(),
    removedAt: row.removedAt?.toISOString() ?? null,
  };
}

export function toProjectPublic(row: ProjectRowForMapping): ProjectPublic {
  return {
    id: row.id,
    name: row.name,
    clientName: row.clientName,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      color: row.category.color,
      parentId: row.category.parentId,
    },
    department: {
      id: row.department.id,
      name: row.department.name,
      slug: row.department.slug,
    },
    commissionRule: {
      id: row.commissionRule.id,
      version: row.commissionRule.version,
      department: row.commissionRule.department,
      poolMode: row.commissionRule.poolMode as ProjectPublic['commissionRule']['poolMode'],
      poolValue: Number(row.commissionRule.poolValue),
    },
    hasOverride: row.hasOverride,
    overrideReason: row.overrideReason,
    revenueUsd: Number(row.revenueUsd),
    developerSalaryPkr: row.developerSalaryPkr != null ? Number(row.developerSalaryPkr) : null,
    status: row.status as ProjectStatus,
    startDate: row.startDate.toISOString(),
    expectedCompletionDate: row.expectedCompletionDate?.toISOString() ?? null,
    notes: row.notes,
    assignments: row.assignments.map(toProjectAssignmentPublic),
    isArchived: row.deletedAt !== null,
    isLockedFromCommissions: row.status === 'cancelled' || row.status === 'refunded',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
  };
}

/* ---------- Category mappers ---------- */

export const PROJECT_CATEGORY_INCLUDE = {
  _count: { select: { projects: { where: { deletedAt: null } } } },
  projects: {
    where: { deletedAt: null },
    select: { revenueUsd: true },
  },
} satisfies Prisma.ProjectCategoryInclude;

export type ProjectCategoryRowForMapping = Prisma.ProjectCategoryGetPayload<{
  include: typeof PROJECT_CATEGORY_INCLUDE;
}>;

export function toProjectCategoryPublic(row: ProjectCategoryRowForMapping): ProjectCategoryPublic {
  const totalRevenueUsd = row.projects.reduce((sum, p) => sum + Number(p.revenueUsd), 0);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    color: row.color,
    parentId: row.parentId,
    defaultRuleId: row.defaultRuleId,
    archived: row.archived,
    projectCount: row._count.projects,
    totalRevenueUsd,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Build a tree of categories from a flat list. Top-level nodes are
 * those with parentId === null; everything else nests under its parent.
 */
export function toCategoryTree(rows: ProjectCategoryRowForMapping[]): ProjectCategoryTreeNode[] {
  const byId = new Map<string, ProjectCategoryTreeNode>();
  for (const row of rows) {
    byId.set(row.id, { ...toProjectCategoryPublic(row), children: [] });
  }
  const roots: ProjectCategoryTreeNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
