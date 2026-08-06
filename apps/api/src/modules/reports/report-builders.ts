/**
 * Report builders (Module 5).
 *
 * Each builder is a pure-ish async function that reads Prisma and
 * returns a `ReportData` (title + columns + rows). The renderer
 * (`core/reports/report-formats.ts`) turns that into CSV / XLSX / PDF —
 * builders never format for a specific output, they just produce the
 * tabular model.
 *
 * Filters (§7.2) arrive as a flat bag; each builder reads only the keys
 * it declares in the definition's `supportedFilters` and ignores the
 * rest.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@futurenostics/db';
import type { ReportFilters } from '@futurenostics/types';
import type { ReportData } from '../../core/reports/report-formats';
import { monthLabel } from '../commissions/commission-calc';

export interface ReportBuilderCtx {
  /** Salary columns are only emitted when the caller may view salary. */
  includeSalary: boolean;
  /** Stamped into the report footer; injected so builders stay testable. */
  now: Date;
}

const BD_DEPARTMENT_SLUG = 'business-development';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

function dateWindow(filters: ReportFilters): { gte?: Date; lte?: Date } {
  const w: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) w.gte = new Date(filters.dateFrom);
  if (filters.dateTo) w.lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  return w;
}

/* ───────────────────────── 1. Employee Master ───────────────────────── */

export async function buildEmployeeMaster(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const where: Prisma.EmployeeWhereInput = {};
  if (filters.department && filters.department !== 'all') {
    where.department = { slug: filters.department };
  }
  if (filters.employeeIds?.length) where.id = { in: filters.employeeIds };

  const rows = await prisma.employee.findMany({
    where,
    include: { department: true, designation: true, status: true, manager: true },
    orderBy: { eid: 'asc' },
  });

  const columns = [
    { key: 'eid', header: 'EID', weight: 1 },
    { key: 'name', header: 'Full Name', weight: 2 },
    { key: 'email', header: 'Email', weight: 2 },
    { key: 'department', header: 'Department', weight: 1.5 },
    { key: 'designation', header: 'Designation', weight: 1.5 },
    { key: 'status', header: 'Status', weight: 1 },
    { key: 'contractType', header: 'Contract', weight: 1 },
    { key: 'joinDate', header: 'Join Date', weight: 1 },
    { key: 'manager', header: 'Manager', weight: 1.5 },
    ...(ctx.includeSalary
      ? [{ key: 'salaryPkr', header: 'Salary (PKR)', align: 'right' as const, weight: 1.2 }]
      : []),
  ];

  return {
    title: 'Employee Master Report',
    subtitle: `${rows.length} employee(s)`,
    columns,
    rows: rows.map((e) => ({
      eid: e.eid,
      name: e.fullName,
      email: e.email,
      department: e.department?.name ?? '—',
      designation: e.designation?.name ?? '—',
      status: e.status?.name ?? '—',
      contractType: e.contractType,
      joinDate: isoDate(e.joinDate),
      manager: e.manager?.fullName ?? '—',
      ...(ctx.includeSalary
        ? { salaryPkr: e.salaryPkr != null ? money(num(e.salaryPkr)) : '—' }
        : {}),
    })),
    generatedAt: ctx.now,
  };
}

/* ─────────────────── run lookup shared by commission reports ─────────────────── */

const RUN_INCLUDE = {
  lineItems: {
    include: {
      project: { include: { category: true } },
      employee: { include: { department: true } },
    },
  },
} satisfies Prisma.CommissionRunInclude;

async function runForMonth(monthKey: string) {
  return prisma.commissionRun.findUnique({ where: { monthKey }, include: RUN_INCLUDE });
}

/* ─────────────────── 2. Monthly Commission Summary ─────────────────── */

export async function buildMonthlyCommissionSummary(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const monthKey = filters.monthKey!;
  const run = await runForMonth(monthKey);
  const label = monthLabel(monthKey);

  const byEmp = new Map<
    string,
    {
      eid: string;
      name: string;
      dept: string | null;
      projects: Set<string>;
      calc: number;
      leave: number;
      manual: number;
      final: number;
    }
  >();

  const fx = run ? num(run.fxRateUsdToPkr) : 0;
  for (const li of run?.lineItems ?? []) {
    if (filters.department && filters.department !== 'all') {
      if (li.employee.department?.slug !== filters.department) continue;
    }
    if (filters.employeeIds?.length && !filters.employeeIds.includes(li.employeeId)) continue;
    const e = byEmp.get(li.employeeId) ?? {
      eid: li.employee.eid,
      name: li.employee.fullName,
      dept: li.employee.department?.name ?? null,
      projects: new Set<string>(),
      calc: 0,
      leave: 0,
      manual: 0,
      final: 0,
    };
    e.projects.add(li.projectId);
    e.calc += num(li.calculatedAmountUsd);
    e.leave += num(li.leaveAdjustmentUsd);
    e.manual += num(li.manualAdjustmentUsd);
    e.final += num(li.finalAmountUsd);
    byEmp.set(li.employeeId, e);
  }

  const rows = [...byEmp.values()]
    .sort((a, b) => b.final - a.final)
    .map((e) => ({
      eid: e.eid,
      name: e.name,
      department: e.dept ?? '—',
      projects: e.projects.size,
      calculatedUsd: money(e.calc),
      leaveUsd: money(e.leave),
      manualUsd: money(e.manual),
      finalUsd: money(e.final),
      approxPkr: Math.round(e.final * fx).toLocaleString('en-US'),
    }));

  return {
    title: `Monthly Commission Summary — ${label}`,
    subtitle: run
      ? `${rows.length} recipient(s) · Status: ${run.status} · FX ${fx} USD→PKR`
      : `No commission run exists for ${label}`,
    columns: [
      { key: 'eid', header: 'EID', weight: 1 },
      { key: 'name', header: 'Employee', weight: 2 },
      { key: 'department', header: 'Department', weight: 1.5 },
      { key: 'projects', header: 'Projects', align: 'right', weight: 0.8 },
      { key: 'calculatedUsd', header: 'Calculated (USD)', align: 'right', weight: 1.2 },
      { key: 'leaveUsd', header: 'Leave adj (USD)', align: 'right', weight: 1.2 },
      { key: 'manualUsd', header: 'Manual adj (USD)', align: 'right', weight: 1.2 },
      { key: 'finalUsd', header: 'Final (USD)', align: 'right', weight: 1.2 },
      { key: 'approxPkr', header: 'Approx PKR', align: 'right', weight: 1.2 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

/* ─────────────────── 3. Payroll Advice (Payoneer) ─────────────────── */

export async function buildPayoneerAdvice(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const monthKey = filters.monthKey!;
  const run = await runForMonth(monthKey);
  const label = monthLabel(monthKey);

  // Net payout per employee (held rows excluded; clawbacks net in).
  const totals = new Map<string, number>();
  for (const li of run?.lineItems ?? []) {
    if (li.isHeld) continue;
    totals.set(li.employeeId, (totals.get(li.employeeId) ?? 0) + num(li.finalAmountUsd));
  }

  const employees = totals.size
    ? await prisma.employee.findMany({ where: { id: { in: [...totals.keys()] } } })
    : [];

  const rows = employees
    .filter((e) => e.hasPayoneer && (totals.get(e.id) ?? 0) > 0)
    .map((e) => ({
      payeeId: e.payoneerAccountId ?? e.payoneerEmail ?? e.eid,
      payeeEmail: e.payoneerEmail ?? e.email,
      amount: (totals.get(e.id) ?? 0).toFixed(2),
      currency: 'USD',
      description: `Commission ${label} (${e.fullName})`,
      clientReference: e.eid,
    }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    title: `Payroll Advice (Payoneer) — ${label}`,
    subtitle: `${rows.length} payee(s) with a Payoneer account · Upload to Payoneer "Make a Payment"`,
    columns: [
      { key: 'payeeId', header: 'Payee Id', weight: 1.5 },
      { key: 'payeeEmail', header: 'Payee Email', weight: 2 },
      { key: 'amount', header: 'Amount', align: 'right', weight: 1 },
      { key: 'currency', header: 'Currency', weight: 0.6 },
      { key: 'description', header: 'Payment Description', weight: 2.2 },
      { key: 'clientReference', header: 'Client Reference', weight: 1 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

/* ─────────────────── 4. Project Activity ─────────────────── */

export async function buildProjectActivity(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (filters.category && filters.category !== 'all') where.category = { slug: filters.category };
  if (filters.projectStatus && filters.projectStatus !== 'all')
    where.status = filters.projectStatus;
  if (filters.department && filters.department !== 'all') {
    where.department = { slug: filters.department };
  }
  const win = dateWindow(filters);
  if (win.gte || win.lte) where.startDate = win;

  const projects = await prisma.project.findMany({
    where,
    include: {
      category: true,
      department: true,
      commissionRule: true,
      assignments: { where: { removedAt: null } },
      commissionLineItems: true,
    },
    orderBy: { startDate: 'desc' },
  });

  const rows = projects.map((p) => ({
    name: p.name,
    client: p.clientName,
    category: p.category?.name ?? '—',
    department: p.department?.name ?? '—',
    status: p.status,
    revenueUsd: money(num(p.revenueUsd)),
    ruleVersion: p.commissionRule ? `v${p.commissionRule.version}` : '—',
    team: p.assignments.length,
    commissionUsd: money(p.commissionLineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0)),
    startDate: isoDate(p.startDate),
    expectedCompletion: isoDate(p.expectedCompletionDate),
  }));

  return {
    title: 'Project Activity Report',
    subtitle: `${rows.length} project(s)`,
    columns: [
      { key: 'name', header: 'Project', weight: 2 },
      { key: 'client', header: 'Client', weight: 1.5 },
      { key: 'category', header: 'Category', weight: 1 },
      { key: 'department', header: 'Department', weight: 1.2 },
      { key: 'status', header: 'Status', weight: 1 },
      { key: 'revenueUsd', header: 'Revenue (USD)', align: 'right', weight: 1.2 },
      { key: 'ruleVersion', header: 'Rule', weight: 0.7 },
      { key: 'team', header: 'Team', align: 'right', weight: 0.6 },
      { key: 'commissionUsd', header: 'Commission (USD)', align: 'right', weight: 1.2 },
      { key: 'startDate', header: 'Start', weight: 1 },
      { key: 'expectedCompletion', header: 'Expected', weight: 1 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

/* ─────────────────── 5. Upwork Revenue ─────────────────── */

export async function buildUpworkRevenue(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    category: { slug: { startsWith: 'upwork' } },
  };
  if (filters.projectStatus && filters.projectStatus !== 'all')
    where.status = filters.projectStatus;
  const win = dateWindow(filters);
  if (win.gte || win.lte) where.startDate = win;

  const projects = await prisma.project.findMany({
    where,
    include: { category: true, commissionLineItems: true },
    orderBy: { startDate: 'desc' },
  });

  const rows = projects.map((p) => {
    const commission = p.commissionLineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0);
    return {
      name: p.name,
      client: p.clientName,
      subtype: p.category?.name ?? '—',
      status: p.status,
      revenueUsd: money(num(p.revenueUsd)),
      commissionUsd: money(commission),
      startDate: isoDate(p.startDate),
      expectedCompletion: isoDate(p.expectedCompletionDate),
    };
  });

  const totalRevenue = projects.reduce((s, p) => s + num(p.revenueUsd), 0);

  return {
    title: 'Upwork Revenue Report',
    subtitle: `${rows.length} Upwork project(s) · Total revenue USD ${money(totalRevenue)}`,
    columns: [
      { key: 'name', header: 'Project', weight: 2 },
      { key: 'client', header: 'Client', weight: 1.5 },
      { key: 'subtype', header: 'Sub-type', weight: 1.2 },
      { key: 'status', header: 'Status', weight: 1 },
      { key: 'revenueUsd', header: 'Revenue (USD)', align: 'right', weight: 1.2 },
      { key: 'commissionUsd', header: 'Commission (USD)', align: 'right', weight: 1.2 },
      { key: 'startDate', header: 'Start', weight: 1 },
      { key: 'expectedCompletion', header: 'Expected', weight: 1 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

/* ─────────────────── 6. BD Performance ─────────────────── */

export async function buildBdPerformance(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const members = await prisma.employee.findMany({
    where: { department: { slug: BD_DEPARTMENT_SLUG } },
    include: {
      projectAssignments: {
        where: { removedAt: null },
        include: { project: true },
      },
      commissionLineItems: filters.monthKey
        ? { where: { run: { monthKey: filters.monthKey } } }
        : true,
    },
    orderBy: { fullName: 'asc' },
  });

  const rows = members.map((m) => {
    const projects = new Map<string, number>();
    for (const a of m.projectAssignments) projects.set(a.projectId, num(a.project.revenueUsd));
    const projectRevenue = [...projects.values()].reduce((s, v) => s + v, 0);
    const commissionsEarned = m.commissionLineItems.reduce(
      (s, li) => s + num(li.finalAmountUsd),
      0,
    );
    return {
      eid: m.eid,
      name: m.fullName,
      projectsBrought: projects.size,
      projectRevenueUsd: money(projectRevenue),
      commissionsEarnedUsd: money(commissionsEarned),
    };
  });

  return {
    title: 'BD Performance Report',
    subtitle: filters.monthKey
      ? `Business Development · commissions for ${monthLabel(filters.monthKey)}`
      : 'Business Development · all-time commissions',
    columns: [
      { key: 'eid', header: 'EID', weight: 1 },
      { key: 'name', header: 'BD Member', weight: 2 },
      { key: 'projectsBrought', header: 'Projects', align: 'right', weight: 0.8 },
      { key: 'projectRevenueUsd', header: 'Project Revenue (USD)', align: 'right', weight: 1.3 },
      { key: 'commissionsEarnedUsd', header: 'Commissions (USD)', align: 'right', weight: 1.3 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

/* ─────────────────── 7. Commission Rules Audit Log ─────────────────── */

export async function buildRulesAuditLog(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const where: Prisma.AuditLogWhereInput = { module: 'commissions', entity: 'CommissionRule' };
  const win = dateWindow(filters);
  if (win.gte || win.lte) where.createdAt = win;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => Boolean(x)))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        include: { employee: true },
      })
    : [];
  const actorLabel = new Map(
    actors.map((u) => [u.id, u.employee ? `${u.employee.fullName} <${u.email}>` : u.email]),
  );

  const rows = logs.map((l) => ({
    when: l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    actor: (l.actorId && actorLabel.get(l.actorId)) || l.actorId || 'system',
    action: l.action,
    ruleId: l.entityId,
    summary: summariseChange(l.before, l.after),
  }));

  return {
    title: 'Commission Rules Audit Log',
    subtitle: `${rows.length} change(s) recorded`,
    columns: [
      { key: 'when', header: 'Timestamp (UTC)', weight: 1.4 },
      { key: 'actor', header: 'Author', weight: 2 },
      { key: 'action', header: 'Action', weight: 1.4 },
      { key: 'ruleId', header: 'Rule ID', weight: 1.4 },
      { key: 'summary', header: 'Change', weight: 2.4 },
    ],
    rows,
    generatedAt: ctx.now,
  };
}

function summariseChange(before: Prisma.JsonValue, after: Prisma.JsonValue): string {
  const a = (after ?? {}) as Record<string, unknown>;
  const bits: string[] = [];
  if (a.version) bits.push(`version ${String(a.version)}`);
  if (a.poolMode) bits.push(`mode ${String(a.poolMode)}`);
  if (a.status) bits.push(`status ${String(a.status)}`);
  if (!bits.length && before === null && after !== null) return 'created';
  return bits.join(' · ') || '—';
}

/* ─────────────────── 8. Annual Summary ─────────────────── */

export async function buildAnnualSummary(
  filters: ReportFilters,
  ctx: ReportBuilderCtx,
): Promise<ReportData> {
  const year = filters.year ?? ctx.now.getUTCFullYear();
  const prev = year - 1;

  // Commission totals per monthKey across both years.
  const runs = await prisma.commissionRun.findMany({
    where: {
      OR: [{ monthKey: { startsWith: `${year}-` } }, { monthKey: { startsWith: `${prev}-` } }],
    },
    include: { lineItems: { select: { finalAmountUsd: true } } },
  });
  const commissionByMonth = new Map<string, number>();
  for (const r of runs) {
    commissionByMonth.set(
      r.monthKey,
      r.lineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0),
    );
  }

  // Project revenue per month (by startDate) across both years.
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      startDate: { gte: new Date(`${prev}-01-01`), lte: new Date(`${year}-12-31T23:59:59.999Z`) },
    },
    select: { revenueUsd: true, startDate: true },
  });
  const revenueByMonth = new Map<string, number>();
  for (const p of projects) {
    const key = p.startDate.toISOString().slice(0, 7);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + num(p.revenueUsd));
  }

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const rows = monthNames.map((mn, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const cy = commissionByMonth.get(`${year}-${mm}`) ?? 0;
    const cp = commissionByMonth.get(`${prev}-${mm}`) ?? 0;
    const ry = revenueByMonth.get(`${year}-${mm}`) ?? 0;
    const rp = revenueByMonth.get(`${prev}-${mm}`) ?? 0;
    return {
      month: mn,
      commissionY: money(cy),
      commissionPrev: money(cp),
      commissionDelta: money(cy - cp),
      revenueY: money(ry),
      revenuePrev: money(rp),
    };
  });

  const totalRow = {
    month: 'TOTAL',
    commissionY: money(
      [...commissionByMonth]
        .filter(([k]) => k.startsWith(`${year}-`))
        .reduce((s, [, v]) => s + v, 0),
    ),
    commissionPrev: money(
      [...commissionByMonth]
        .filter(([k]) => k.startsWith(`${prev}-`))
        .reduce((s, [, v]) => s + v, 0),
    ),
    commissionDelta: '',
    revenueY: money(
      [...revenueByMonth].filter(([k]) => k.startsWith(`${year}-`)).reduce((s, [, v]) => s + v, 0),
    ),
    revenuePrev: money(
      [...revenueByMonth].filter(([k]) => k.startsWith(`${prev}-`)).reduce((s, [, v]) => s + v, 0),
    ),
  };

  return {
    title: `Annual Summary — ${year} vs ${prev}`,
    subtitle: 'Commission disbursed + project revenue booked, month by month',
    columns: [
      { key: 'month', header: 'Month', weight: 0.8 },
      { key: 'commissionY', header: `Commission ${year}`, align: 'right', weight: 1.3 },
      { key: 'commissionPrev', header: `Commission ${prev}`, align: 'right', weight: 1.3 },
      { key: 'commissionDelta', header: 'Δ Commission', align: 'right', weight: 1.2 },
      { key: 'revenueY', header: `Revenue ${year}`, align: 'right', weight: 1.3 },
      { key: 'revenuePrev', header: `Revenue ${prev}`, align: 'right', weight: 1.3 },
    ],
    rows: [...rows, totalRow],
    generatedAt: ctx.now,
  };
}
