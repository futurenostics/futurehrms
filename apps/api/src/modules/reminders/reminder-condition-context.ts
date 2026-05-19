/**
 * Context hydrator for the condition evaluator.
 *
 * Given a source (kind + id), fetches the entity with every relation
 * the field catalog references, then wraps it under the source's key
 * so dotted paths like `employee.department.slug` resolve cleanly.
 *
 * Returns an EvalContext: `{ <sourceKind>: { …entity with relations } }`.
 *
 * Used by:
 *   - trigger-evaluator.service (event path) when a rule has
 *     conditions — we hydrate so paths beyond the flat event payload
 *     (e.g. `employee.department.slug`) resolve
 *   - reminder-scheduler.service (cron path) where we already have
 *     just the candidate id and need the full entity for filtering
 *
 * The shape of the returned object is intentionally close to the raw
 * Prisma model — minor field renames (e.g. exposing `salaryPkr` on
 * Employee via SalaryHistory) are derived inline rather than stored.
 *
 * Returns null if the entity is missing — caller falls back to
 * "skip this candidate".
 */
import { prisma } from '@futurenostics/db';
import type { ResolverSource } from './recipient-resolver';
import type { EvalContext } from './reminder-conditions.evaluator';

export async function buildConditionContext(source: ResolverSource): Promise<EvalContext | null> {
  if (!source) return null;
  switch (source.kind) {
    case 'employee':
      return loadEmployee(source.id);
    case 'employeeDocument':
      return loadEmployeeDocument(source.id);
    case 'department':
      return loadDepartment(source.id);
    case 'designation':
      return loadDesignation(source.id);
    case 'project':
      return loadProject(source.id);
    case 'projectCategory':
      return loadProjectCategory(source.id);
    case 'projectAssignment':
      return loadProjectAssignment(source.id);
    case 'commissionRule':
      return loadCommissionRule(source.id);
    case 'commissionRun':
      return loadCommissionRun(source.id);
    default:
      return null;
  }
}

async function loadEmployee(id: string): Promise<EvalContext | null> {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      designation: true,
      status: true,
      manager: { select: { id: true, eid: true, fullName: true, email: true } },
    },
  });
  if (!employee) return null;
  return {
    employee: {
      ...employee,
      // Cast Decimal → number for the evaluator's number operators.
      salaryPkr: employee.salaryPkr != null ? Number(employee.salaryPkr) : null,
    },
  };
}

async function loadEmployeeDocument(id: string): Promise<EvalContext | null> {
  const doc = await prisma.employeeDocument.findUnique({
    where: { id },
    include: {
      employee: {
        include: { department: true, designation: true, status: true },
      },
    },
  });
  if (!doc) return null;
  return { employeeDocument: doc };
}

async function loadDepartment(id: string): Promise<EvalContext | null> {
  const row = await prisma.department.findUnique({ where: { id } });
  if (!row) return null;
  return { department: row };
}

async function loadDesignation(id: string): Promise<EvalContext | null> {
  const row = await prisma.designation.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!row) return null;
  return { designation: row };
}

async function loadProject(id: string): Promise<EvalContext | null> {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { category: true, department: true },
  });
  if (!row) return null;
  return {
    project: {
      ...row,
      // Decimal → number for the number operators (revenueUsd is the
      // common numeric filter target).
      revenueUsd: row.revenueUsd != null ? Number(row.revenueUsd) : null,
    },
  };
}

async function loadProjectCategory(id: string): Promise<EvalContext | null> {
  const row = await prisma.projectCategory.findUnique({ where: { id } });
  if (!row) return null;
  return { projectCategory: row };
}

async function loadProjectAssignment(id: string): Promise<EvalContext | null> {
  const row = await prisma.projectAssignment.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, status: true } },
      employee: { select: { id: true, eid: true, fullName: true, email: true } },
    },
  });
  if (!row) return null;
  return {
    projectAssignment: {
      ...row,
      percentage: row.percentage != null ? Number(row.percentage) : null,
    },
  };
}

async function loadCommissionRule(id: string): Promise<EvalContext | null> {
  const row = await prisma.commissionRule.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!row) return null;
  return {
    commissionRule: {
      ...row,
      poolValue: row.poolValue != null ? Number(row.poolValue) : null,
      minProjectRevenueUsd:
        row.minProjectRevenueUsd != null ? Number(row.minProjectRevenueUsd) : null,
    },
  };
}

async function loadCommissionRun(id: string): Promise<EvalContext | null> {
  const row = await prisma.commissionRun.findUnique({ where: { id } });
  if (!row) return null;
  return {
    commissionRun: {
      ...row,
      fxRateUsdToPkr: row.fxRateUsdToPkr != null ? Number(row.fxRateUsdToPkr) : null,
    },
  };
}
