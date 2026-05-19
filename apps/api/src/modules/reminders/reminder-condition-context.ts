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

/**
 * Batch version of `buildConditionContext`. Groups the input sources
 * by kind and runs ONE Prisma `findMany` per kind instead of one
 * `findUnique` per source. The scheduler's cron loop uses this on
 * every tick — at 100 sources it's the difference between 100 round
 * trips and ~3.
 *
 * The returned map is keyed `${kind}:${id}` so callers can do quick
 * `map.get(`${source.kind}:${source.id}`)` lookups without re-keying
 * by entity each time.
 */
export async function buildConditionContexts(
  sources: Array<NonNullable<ResolverSource>>,
): Promise<Map<string, EvalContext>> {
  const byKind = new Map<string, string[]>();
  for (const s of sources) {
    const ids = byKind.get(s.kind);
    if (ids) ids.push(s.id);
    else byKind.set(s.kind, [s.id]);
  }

  const out = new Map<string, EvalContext>();
  // Hydrate every kind's id list in parallel — they touch different
  // tables so there's no contention.
  await Promise.all(
    Array.from(byKind.entries()).map(async ([kind, ids]) => {
      const rows = await loadManyForKind(kind, ids);
      for (const [id, ctx] of rows) out.set(`${kind}:${id}`, ctx);
    }),
  );
  return out;
}

async function loadManyForKind(kind: string, ids: string[]): Promise<Array<[string, EvalContext]>> {
  if (ids.length === 0) return [];
  switch (kind) {
    case 'employee': {
      const rows = await prisma.employee.findMany({
        where: { id: { in: ids } },
        include: {
          department: true,
          designation: true,
          status: true,
          manager: { select: { id: true, eid: true, fullName: true, email: true } },
        },
      });
      return rows.map((r) => [
        r.id,
        {
          employee: {
            ...r,
            salaryPkr: r.salaryPkr != null ? Number(r.salaryPkr) : null,
          },
        },
      ]);
    }
    case 'employeeDocument': {
      const rows = await prisma.employeeDocument.findMany({
        where: { id: { in: ids } },
        include: {
          employee: {
            include: { department: true, designation: true, status: true },
          },
        },
      });
      return rows.map((r) => [r.id, { employeeDocument: r }]);
    }
    case 'department': {
      const rows = await prisma.department.findMany({ where: { id: { in: ids } } });
      return rows.map((r) => [r.id, { department: r }]);
    }
    case 'designation': {
      const rows = await prisma.designation.findMany({
        where: { id: { in: ids } },
        include: { department: true },
      });
      return rows.map((r) => [r.id, { designation: r }]);
    }
    case 'project': {
      const rows = await prisma.project.findMany({
        where: { id: { in: ids } },
        include: { category: true, department: true },
      });
      return rows.map((r) => [
        r.id,
        {
          project: {
            ...r,
            revenueUsd: r.revenueUsd != null ? Number(r.revenueUsd) : null,
          },
        },
      ]);
    }
    case 'projectCategory': {
      const rows = await prisma.projectCategory.findMany({ where: { id: { in: ids } } });
      return rows.map((r) => [r.id, { projectCategory: r }]);
    }
    case 'projectAssignment': {
      const rows = await prisma.projectAssignment.findMany({
        where: { id: { in: ids } },
        include: {
          project: { select: { id: true, name: true, status: true } },
          employee: { select: { id: true, eid: true, fullName: true, email: true } },
        },
      });
      return rows.map((r) => [
        r.id,
        {
          projectAssignment: {
            ...r,
            percentage: r.percentage != null ? Number(r.percentage) : null,
          },
        },
      ]);
    }
    case 'commissionRule': {
      const rows = await prisma.commissionRule.findMany({
        where: { id: { in: ids } },
        include: { category: true },
      });
      return rows.map((r) => [
        r.id,
        {
          commissionRule: {
            ...r,
            poolValue: r.poolValue != null ? Number(r.poolValue) : null,
            minProjectRevenueUsd:
              r.minProjectRevenueUsd != null ? Number(r.minProjectRevenueUsd) : null,
          },
        },
      ]);
    }
    case 'commissionRun': {
      const rows = await prisma.commissionRun.findMany({ where: { id: { in: ids } } });
      return rows.map((r) => [
        r.id,
        {
          commissionRun: {
            ...r,
            fxRateUsdToPkr: r.fxRateUsdToPkr != null ? Number(r.fxRateUsdToPkr) : null,
          },
        },
      ]);
    }
    default:
      return [];
  }
}

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
