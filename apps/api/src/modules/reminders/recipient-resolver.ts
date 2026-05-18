/**
 * RecipientResolver — maps a (rule, source) pair to user IDs.
 *
 * Reminder rules don't hard-code who to notify; they reference a
 * resolver by key. The resolver is responsible for figuring out the
 * concrete user list at fire time. Built-ins ship with the module;
 * future modules can register their own.
 *
 * Built-ins shipped in Session 3 (key + label match the design's
 * Recipients column):
 *
 *   self                : just the source employee's user
 *   direct-manager      : source's manager.user
 *   hr-admins           : everyone with hr_admin role
 *   manager+hr          : direct-manager ∪ hr-admins
 *   manager+employee    : direct-manager ∪ self
 *   dept-managers       : all managers in the source's department
 *   dept-employees      : every employee in the source's department
 *   bd-managers         : managers in the Business Development department
 *
 * The source can be: an Employee, an EmployeeDocument, or null (for
 * cron-fired rules where the entity is implied by the query kind).
 *
 * Resolution is best-effort: if a source's manager has no linked
 * user (orphaned employee), that recipient is dropped silently. The
 * scheduler logs zero-recipient fires so an HR admin can investigate.
 */
import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { ReminderRule } from '@prisma/client';

export type ResolverSource =
  | { kind: 'employee'; id: string }
  | { kind: 'employeeDocument'; id: string }
  | null;

export type ResolverFn = (rule: ReminderRule, source: ResolverSource) => Promise<string[]>;

export interface RecipientResolverDefinition {
  key: string;
  /** Short label for the Recipients column on the rules list page. */
  label: string;
  description?: string;
  resolve: ResolverFn;
}

@Injectable()
export class RecipientResolverRegistry {
  private readonly logger = new Logger(RecipientResolverRegistry.name);
  private readonly defs = new Map<string, RecipientResolverDefinition>();

  constructor() {
    this.registerBuiltins();
  }

  register(def: RecipientResolverDefinition): void {
    if (this.defs.has(def.key)) {
      this.logger.warn(`Recipient resolver '${def.key}' re-registered.`);
    }
    this.defs.set(def.key, def);
  }

  get(key: string): RecipientResolverDefinition | undefined {
    return this.defs.get(key);
  }

  list(): RecipientResolverDefinition[] {
    return Array.from(this.defs.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  /** Throws if the resolver isn't registered. */
  async resolve(key: string, rule: ReminderRule, source: ResolverSource): Promise<string[]> {
    const def = this.defs.get(key);
    if (!def) {
      throw new Error(
        `Unknown recipient resolver '${key}'. Did the owning module forget to register it?`,
      );
    }
    const ids = await def.resolve(rule, source);
    // Drop duplicates + falsy entries — defensive against composites.
    return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  }

  private registerBuiltins(): void {
    this.register({
      key: 'self',
      label: 'Employee',
      description: 'Just the employee the reminder is about',
      resolve: async (_rule, source) => resolveSelfUserId(source),
    });

    this.register({
      key: 'direct-manager',
      label: 'Direct manager',
      description: 'The source employee’s manager',
      resolve: async (_rule, source) => resolveManagerUserIds(source),
    });

    this.register({
      key: 'hr-admins',
      label: 'HR',
      description: 'Everyone with the hr_admin role',
      resolve: async () => resolveHrAdmins(),
    });

    this.register({
      key: 'manager+hr',
      label: 'HR · Direct manager',
      description: 'Direct manager plus HR admins',
      resolve: async (_rule, source) => {
        const [mgr, hr] = await Promise.all([resolveManagerUserIds(source), resolveHrAdmins()]);
        return [...mgr, ...hr];
      },
    });

    this.register({
      key: 'manager+employee',
      label: 'HR · Manager + Employee',
      description: 'Direct manager and the employee themselves, with HR cc',
      resolve: async (_rule, source) => {
        const [self, mgr, hr] = await Promise.all([
          resolveSelfUserId(source),
          resolveManagerUserIds(source),
          resolveHrAdmins(),
        ]);
        return [...self, ...mgr, ...hr];
      },
    });

    this.register({
      key: 'dept-managers',
      label: 'HR · Dept managers',
      description: 'All managers in the source’s department',
      resolve: async (rule, source) => resolveDeptManagerUserIds(deptIdFor(rule, source)),
    });

    this.register({
      key: 'dept-employees',
      label: 'HR · Employees',
      description: 'Every employee in the source’s department',
      resolve: async (rule, source) => resolveDeptEmployeeUserIds(deptIdFor(rule, source)),
    });

    this.register({
      key: 'bd-managers',
      label: 'HR · BD managers',
      description: 'Managers in the Business Development department',
      resolve: async () => resolveDeptManagersBySlug('business-development'),
    });
  }
}

/* ---------- internal resolvers ---------- */

async function resolveSelfUserId(source: ResolverSource): Promise<string[]> {
  if (!source || source.kind !== 'employee') return [];
  const u = await prisma.user.findFirst({
    where: { employeeId: source.id, isActive: true },
    select: { id: true },
  });
  return u ? [u.id] : [];
}

async function resolveManagerUserIds(source: ResolverSource): Promise<string[]> {
  const employeeId =
    source?.kind === 'employee'
      ? source.id
      : source?.kind === 'employeeDocument'
        ? await employeeIdFromDocument(source.id)
        : null;
  if (!employeeId) return [];
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { managerId: true },
  });
  if (!emp?.managerId) return [];
  const mgrUser = await prisma.user.findFirst({
    where: { employeeId: emp.managerId, isActive: true },
    select: { id: true },
  });
  return mgrUser ? [mgrUser.id] : [];
}

async function resolveHrAdmins(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { some: { role: { slug: { in: ['hr_admin', 'super_admin'] } } } },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function resolveDeptManagerUserIds(departmentId: string | null): Promise<string[]> {
  if (!departmentId) return [];
  const employees = await prisma.employee.findMany({
    where: { departmentId, deletedAt: null, reports: { some: {} } },
    select: { user: { select: { id: true, isActive: true } } },
  });
  return employees
    .map((e) => e.user)
    .filter((u): u is { id: string; isActive: boolean } => !!u && u.isActive)
    .map((u) => u.id);
}

async function resolveDeptEmployeeUserIds(departmentId: string | null): Promise<string[]> {
  if (!departmentId) return [];
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      employee: { departmentId, deletedAt: null },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function resolveDeptManagersBySlug(slug: string): Promise<string[]> {
  const dept = await prisma.department.findUnique({ where: { slug } });
  return dept ? resolveDeptManagerUserIds(dept.id) : [];
}

function deptIdFor(rule: ReminderRule, _source: ResolverSource): string | null {
  // Today we trust the rule's departmentId. In future we might consult
  // the source's own department field too — keeping the signature
  // ready for that without changing call sites.
  return rule.departmentId ?? null;
}

async function employeeIdFromDocument(documentId: string): Promise<string | null> {
  const d = await prisma.employeeDocument.findUnique({
    where: { id: documentId },
    select: { employeeId: true },
  });
  return d?.employeeId ?? null;
}
