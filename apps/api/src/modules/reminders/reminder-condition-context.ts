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
