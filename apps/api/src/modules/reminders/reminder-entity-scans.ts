/**
 * Shared entity scans for the reminder pipeline.
 *
 * Both the cron-side scheduler and the FE preview endpoints need the
 * same answer to "what rows are in scope when scanning entity kind X
 * under (optional) departmentId Y". This module owns that mapping so
 * the two callers can't drift.
 *
 * Soft-delete + archive escapes are baked in here — every consumer
 * gets them for free.
 */
import { prisma } from '@futurenostics/db';
import type { ResolverSource } from './recipient-resolver';

export const SCANNABLE_KINDS = [
  'employee',
  'employeeDocument',
  'department',
  'designation',
  'project',
  'projectCategory',
  'projectAssignment',
  'commissionRule',
  'commissionRun',
] as const;

export type ScannableKind = (typeof SCANNABLE_KINDS)[number];

export function isScannableKind(kind: string): kind is ScannableKind {
  return (SCANNABLE_KINDS as readonly string[]).includes(kind);
}

export async function fetchSourcesForKind(
  kind: string,
  departmentId: string | null,
): Promise<NonNullable<ResolverSource>[]> {
  switch (kind) {
    case 'employee': {
      const rows = await prisma.employee.findMany({
        where: { deletedAt: null, ...(departmentId ? { departmentId } : {}) },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'employee' as const, id: r.id }));
    }
    case 'employeeDocument': {
      const rows = await prisma.employeeDocument.findMany({
        where: departmentId ? { employee: { departmentId } } : {},
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'employeeDocument' as const, id: r.id }));
    }
    case 'department': {
      const rows = await prisma.department.findMany({
        where: { isActive: true, ...(departmentId ? { id: departmentId } : {}) },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'department' as const, id: r.id }));
    }
    case 'designation': {
      const rows = await prisma.designation.findMany({
        where: { isActive: true, ...(departmentId ? { departmentId } : {}) },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'designation' as const, id: r.id }));
    }
    case 'project': {
      const rows = await prisma.project.findMany({
        where: { deletedAt: null, ...(departmentId ? { departmentId } : {}) },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'project' as const, id: r.id }));
    }
    case 'projectCategory': {
      const rows = await prisma.projectCategory.findMany({
        where: { deletedAt: null, archived: false },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'projectCategory' as const, id: r.id }));
    }
    case 'projectAssignment': {
      const rows = await prisma.projectAssignment.findMany({
        where: {
          removedAt: null,
          ...(departmentId ? { project: { departmentId } } : {}),
        },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'projectAssignment' as const, id: r.id }));
    }
    case 'commissionRule': {
      const rows = await prisma.commissionRule.findMany({
        where: { status: 'active' },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'commissionRule' as const, id: r.id }));
    }
    case 'commissionRun': {
      const rows = await prisma.commissionRun.findMany({
        where: { status: { not: 'locked' } },
        select: { id: true },
      });
      return rows.map((r) => ({ kind: 'commissionRun' as const, id: r.id }));
    }
    default:
      return [];
  }
}

/**
 * Best-effort display label for a scanned entity. Used by the preview
 * endpoints to render "N entities match · 3 shown" with names instead
 * of opaque ids.
 */
export async function fetchLabelsForSample(
  kind: string,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  switch (kind) {
    case 'employee': {
      const rows = await prisma.employee.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, eid: true },
      });
      for (const r of rows) out.set(r.id, `${r.fullName}${r.eid ? ` (${r.eid})` : ''}`);
      return out;
    }
    case 'employeeDocument': {
      const rows = await prisma.employeeDocument.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          kind: true,
          employee: { select: { fullName: true } },
        },
      });
      for (const r of rows) out.set(r.id, `${r.employee.fullName} — ${r.kind}`);
      return out;
    }
    case 'department':
    case 'projectCategory': {
      const rows =
        kind === 'department'
          ? await prisma.department.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
          : await prisma.projectCategory.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            });
      for (const r of rows) out.set(r.id, r.name);
      return out;
    }
    case 'designation': {
      const rows = await prisma.designation.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      for (const r of rows) out.set(r.id, r.name);
      return out;
    }
    case 'project': {
      const rows = await prisma.project.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      for (const r of rows) out.set(r.id, r.name);
      return out;
    }
    case 'projectAssignment': {
      const rows = await prisma.projectAssignment.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          project: { select: { name: true } },
          employee: { select: { fullName: true } },
        },
      });
      for (const r of rows) out.set(r.id, `${r.employee.fullName} on ${r.project.name}`);
      return out;
    }
    case 'commissionRule': {
      const rows = await prisma.commissionRule.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          version: true,
          category: { select: { name: true } },
        },
      });
      for (const r of rows) out.set(r.id, `${r.category.name} v${r.version}`);
      return out;
    }
    case 'commissionRun': {
      const rows = await prisma.commissionRun.findMany({
        where: { id: { in: ids } },
        select: { id: true, monthKey: true, status: true },
      });
      for (const r of rows) out.set(r.id, `${r.monthKey} · ${r.status}`);
      return out;
    }
    default:
      return out;
  }
}
