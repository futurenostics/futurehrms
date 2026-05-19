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

/** Per-entry configuration carried inside the rule's recipientResolvers array. */
export type ResolverConfig = Record<string, unknown> | undefined;

export type ResolverFn = (
  rule: ReminderRule,
  source: ResolverSource,
  config: ResolverConfig,
) => Promise<string[]>;

/**
 * Light schema declaration so the FE knows what config inputs to
 * render for a resolver kind. Field types map to FE components:
 *   user-multi  → MultiCombobox over users
 *   role        → Combobox over roles
 *   enum        → Combobox over a fixed list (options[])
 */
export type ResolverConfigField =
  | { key: string; type: 'user-multi'; label: string; required?: boolean }
  | { key: string; type: 'role'; label: string; required?: boolean }
  | {
      key: string;
      type: 'enum';
      label: string;
      required?: boolean;
      options: Array<{ value: string; label: string; description?: string }>;
    };

export interface RecipientResolverDefinition {
  key: string;
  /** Short label for the Recipients column on the rules list page. */
  label: string;
  description?: string;
  /** Empty / absent = no user-supplied config. */
  configSchema?: ResolverConfigField[];
  resolve: ResolverFn;
}

/** Single entry of the multi-source recipient array on a rule. */
export interface RecipientEntry {
  kind: string;
  config?: ResolverConfig;
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
  async resolve(
    key: string,
    rule: ReminderRule,
    source: ResolverSource,
    config?: ResolverConfig,
  ): Promise<string[]> {
    const def = this.defs.get(key);
    if (!def) {
      throw new Error(
        `Unknown recipient resolver '${key}'. Did the owning module forget to register it?`,
      );
    }
    const ids = await def.resolve(rule, source, config);
    // Drop duplicates + falsy entries — defensive against composites.
    return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  }

  /**
   * Multi-source dispatcher: takes the array stored on
   * `ReminderRule.recipientResolvers` (or the legacy single-string
   * fallback) and returns the dedup'd union of user IDs.
   *
   * Each entry's resolution is best-effort — a misconfigured entry
   * (unknown kind, missing config) drops its slice but does not abort
   * the whole resolution. Errors are logged at debug.
   */
  async resolveMany(
    entries: RecipientEntry[],
    rule: ReminderRule,
    source: ResolverSource,
  ): Promise<string[]> {
    const all = new Set<string>();
    for (const entry of entries) {
      try {
        const ids = await this.resolve(entry.kind, rule, source, entry.config);
        for (const id of ids) all.add(id);
      } catch (err) {
        this.logger.debug(
          `recipient entry '${entry.kind}' on rule '${rule.key}' threw: ${(err as Error).message}`,
        );
      }
    }
    return Array.from(all);
  }

  private registerBuiltins(): void {
    this.register({
      key: 'self',
      label: 'Employee (self)',
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
      label: 'HR admins',
      description: 'Everyone with the hr_admin role',
      resolve: async () => resolveHrAdmins(),
    });

    this.register({
      key: 'manager+hr',
      label: 'Manager + HR',
      description: 'Direct manager plus HR admins',
      resolve: async (_rule, source) => {
        const [mgr, hr] = await Promise.all([resolveManagerUserIds(source), resolveHrAdmins()]);
        return [...mgr, ...hr];
      },
    });

    this.register({
      key: 'manager+employee',
      label: 'Manager + Employee + HR',
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
      label: 'Department managers',
      description: 'All managers in the source’s department',
      resolve: async (rule, source) => resolveDeptManagerUserIds(deptIdFor(rule, source)),
    });

    this.register({
      key: 'dept-employees',
      label: 'Department employees',
      description: 'Every employee in the source’s department',
      resolve: async (rule, source) => resolveDeptEmployeeUserIds(deptIdFor(rule, source)),
    });

    this.register({
      key: 'bd-managers',
      label: 'BD managers',
      description: 'Managers in the Business Development department',
      resolve: async () => resolveDeptManagersBySlug('business-development'),
    });

    /* ---------- New parameterised resolvers ---------- */

    this.register({
      key: 'specific-employees',
      label: 'Specific employee(s)',
      description: 'Hand-picked one or more employees by id',
      configSchema: [
        { key: 'employeeIds', type: 'user-multi', label: 'Employees', required: true },
      ],
      resolve: async (_rule, _source, config) => {
        const ids = readStringArray(config, 'employeeIds');
        if (ids.length === 0) return [];
        const rows = await prisma.user.findMany({
          where: { isActive: true, employeeId: { in: ids } },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      },
    });

    this.register({
      key: 'role-members',
      label: 'Role members',
      description: 'Everyone holding a specific role',
      configSchema: [{ key: 'roleSlug', type: 'role', label: 'Role', required: true }],
      resolve: async (_rule, _source, config) => {
        const slug = readString(config, 'roleSlug');
        if (!slug) return [];
        const rows = await prisma.user.findMany({
          where: { isActive: true, roles: { some: { role: { slug } } } },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      },
    });

    this.register({
      key: 'relation',
      label: 'Relation to source',
      description: 'Pick a named relation on the source entity',
      configSchema: [
        {
          key: 'relation',
          type: 'enum',
          label: 'Relation',
          required: true,
          options: [
            { value: 'manager', label: 'Direct manager' },
            {
              value: 'manager-of-manager',
              label: 'Manager of manager',
              description: "Skip-level — the manager's manager",
            },
            { value: 'reports', label: 'Direct reports' },
            { value: 'dept-managers', label: 'Department managers' },
            { value: 'dept-employees', label: 'Department employees' },
            { value: 'self', label: 'Self (the source employee)' },
          ],
        },
      ],
      resolve: async (rule, source, config) => {
        const relation = readString(config, 'relation');
        switch (relation) {
          case 'manager':
            return resolveManagerUserIds(source);
          case 'manager-of-manager':
            return resolveManagerOfManagerUserIds(source);
          case 'reports':
            return resolveDirectReportUserIds(source);
          case 'dept-managers':
            return resolveDeptManagerUserIds(deptIdFor(rule, source));
          case 'dept-employees':
            return resolveDeptEmployeeUserIds(deptIdFor(rule, source));
          case 'self':
            return resolveSelfUserId(source);
          default:
            return [];
        }
      },
    });
  }
}

/**
 * Read the rule's recipient list, falling back to the legacy
 * single-string column when the new JSON array is null. Always
 * returns at least one entry so trigger paths can iterate without
 * a defensive empty check.
 */
export function readRecipientEntries(rule: ReminderRule): RecipientEntry[] {
  const raw = rule.recipientResolvers;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: RecipientEntry[] = [];
    for (const r of raw) {
      if (!r || typeof r !== 'object') continue;
      const obj = r as { kind?: unknown; config?: unknown };
      if (typeof obj.kind !== 'string' || obj.kind.length === 0) continue;
      const entry: RecipientEntry = { kind: obj.kind };
      if (obj.config && typeof obj.config === 'object') {
        entry.config = obj.config as Record<string, unknown>;
      }
      out.push(entry);
    }
    if (out.length > 0) return out;
  }
  // Legacy fallback — Phase-3-era rules carry a single resolver key.
  return [{ kind: rule.recipientResolver }];
}

/* ---------- config readers ---------- */

function readString(config: ResolverConfig, key: string): string | null {
  if (!config) return null;
  const v = config[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function readStringArray(config: ResolverConfig, key: string): string[] {
  if (!config) return [];
  const v = config[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
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

async function resolveManagerOfManagerUserIds(source: ResolverSource): Promise<string[]> {
  const employeeId =
    source?.kind === 'employee'
      ? source.id
      : source?.kind === 'employeeDocument'
        ? await employeeIdFromDocument(source.id)
        : null;
  if (!employeeId) return [];
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { manager: { select: { managerId: true } } },
  });
  const skipLevelId = emp?.manager?.managerId;
  if (!skipLevelId) return [];
  const u = await prisma.user.findFirst({
    where: { employeeId: skipLevelId, isActive: true },
    select: { id: true },
  });
  return u ? [u.id] : [];
}

async function resolveDirectReportUserIds(source: ResolverSource): Promise<string[]> {
  const employeeId =
    source?.kind === 'employee'
      ? source.id
      : source?.kind === 'employeeDocument'
        ? await employeeIdFromDocument(source.id)
        : null;
  if (!employeeId) return [];
  const reports = await prisma.employee.findMany({
    where: { managerId: employeeId, deletedAt: null },
    select: { user: { select: { id: true, isActive: true } } },
  });
  return reports
    .map((e) => e.user)
    .filter((u): u is { id: string; isActive: boolean } => !!u && u.isActive)
    .map((u) => u.id);
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
