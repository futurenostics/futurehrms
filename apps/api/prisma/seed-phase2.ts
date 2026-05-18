/**
 * Phase 2 seed — ProjectCategory taxonomy, CommissionRule rows
 * reproducing PNG 11 + PNG 12 verbatim, and a sample slate of
 * projects with role assignments.
 *
 * Idempotent: every upsert keys off a stable slug or unique tuple.
 * Re-runs do not duplicate.
 *
 * Called from prisma/seed.ts after employees are in place (it relies
 * on `findFirst` by full name to wire ProjectAssignment rows).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { calcProjectLineItems, monthLabel } from '../src/modules/commissions/commission-calc';

interface CategorySpec {
  slug: string;
  name: string;
  description: string;
  color: string;
  parentSlug?: string;
  archived?: boolean;
}

const CATEGORIES: CategorySpec[] = [
  {
    slug: 'external',
    name: 'External',
    description: 'Direct-client engagements sourced via referral, BD, or returning clients.',
    color: 'violet',
  },
  {
    slug: 'upwork',
    name: 'Upwork',
    description: 'Projects sourced through Upwork profiles — sub-categorized by profile.',
    color: 'amber',
  },
  {
    slug: 'upwork-johnny',
    name: 'Johnny',
    description: 'Upwork client engagements from the Johnny profile.',
    color: 'orange',
    parentSlug: 'upwork',
  },
  {
    slug: 'upwork-michele',
    name: 'Michele',
    description: 'Upwork client engagements from the Michele profile.',
    color: 'red',
    parentSlug: 'upwork',
  },
  {
    slug: 'b2b',
    name: 'B2B',
    description: 'Long-term partnerships, retainers, and channel deals.',
    color: 'teal',
  },
  {
    slug: 'internal-rd',
    name: 'Internal R&D',
    description: 'Internal R&D — no client revenue, no commissions accrued.',
    color: 'slate',
    archived: true,
  },
];

/**
 * Rule rows reproducing PNG 11 + PNG 12 verbatim. PNG 11 shows the
 * commission pool % per dept × category; PNG 12 shows the role split
 * inside the pool. For BD's "read amounts" rows we use the BD-Manager
 * / BD-Lead / BD-Associate splits the design hinted at; treat them as
 * three role slots `winner` / `communicator` / `eligible_team` for
 * uniformity (the rule's role names are arbitrary strings — the FE
 * renders them with the design's display label).
 *
 * One row is left as `status: 'pending'` to match PNG 11's "Awaiting
 * decision" row for Business Dev × B2B.
 */
interface RuleSpec {
  departmentSlug: string;
  categorySlug: string;
  poolMode: 'percentage' | 'fixed';
  poolValue: number;
  rolePercentages: Record<string, number>;
  status?: 'active' | 'pending';
  pendingReason?: string;
}

const RULES: RuleSpec[] = [
  {
    departmentSlug: 'engineering',
    categorySlug: 'external',
    poolMode: 'percentage',
    poolValue: 24,
    rolePercentages: { winner: 50, communicator: 30, eligible_team: 20 },
  },
  {
    departmentSlug: 'engineering',
    categorySlug: 'upwork',
    poolMode: 'percentage',
    poolValue: 38,
    rolePercentages: { winner: 58, communicator: 30, eligible_team: 12 },
  },
  {
    departmentSlug: 'engineering',
    categorySlug: 'b2b',
    poolMode: 'percentage',
    poolValue: 29,
    rolePercentages: { winner: 70, communicator: 30, eligible_team: 0 },
  },
  {
    departmentSlug: 'business-development',
    categorySlug: 'external',
    poolMode: 'percentage',
    poolValue: 28,
    rolePercentages: { winner: 85, communicator: 12, eligible_team: 3 },
  },
  {
    departmentSlug: 'business-development',
    categorySlug: 'upwork',
    poolMode: 'percentage',
    poolValue: 32,
    rolePercentages: { winner: 85, communicator: 10, eligible_team: 5 },
  },
  {
    departmentSlug: 'business-development',
    categorySlug: 'b2b',
    poolMode: 'percentage',
    poolValue: 0,
    rolePercentages: { winner: 0, communicator: 0, eligible_team: 0 },
    status: 'pending',
    pendingReason: 'Awaiting decision — escalated to leadership',
  },
  {
    departmentSlug: 'operations',
    categorySlug: 'external',
    poolMode: 'percentage',
    poolValue: 12,
    rolePercentages: { winner: 60, communicator: 40, eligible_team: 0 },
  },
  {
    departmentSlug: 'operations',
    categorySlug: 'upwork',
    poolMode: 'percentage',
    poolValue: 15,
    rolePercentages: { winner: 60, communicator: 30, eligible_team: 10 },
  },
];

interface ProjectSpec {
  name: string;
  clientName: string;
  categorySlug: string;
  departmentSlug: string;
  revenueUsd: number;
  status: 'draft' | 'active' | 'in_billing' | 'on_hold' | 'completed' | 'cancelled' | 'refunded';
  startDate: string;
  assignments: Array<{ employeeName: string; roleName: string; percentage: number }>;
  notes?: string;
}

/**
 * 16 sample projects reproducing the PNG 07 list plus a handful of
 * extras so each category has multiple rows. Employees referenced by
 * fullName — must match seed.ts entries.
 *
 * Per-assignment percentages match the rule defaults exactly so
 * hasOverride stays false on every sample row.
 */
const PROJECTS: ProjectSpec[] = [
  // Engineering / External
  {
    name: 'Acme Web Refresh',
    clientName: 'Acme Inc.',
    categorySlug: 'external',
    departmentSlug: 'engineering',
    revenueUsd: 12_000,
    status: 'in_billing',
    startDate: '2026-04-01',
    assignments: [
      { employeeName: 'Bilal Khan', roleName: 'winner', percentage: 50 },
      { employeeName: 'Talha Ahmed', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Faisal Hussain', roleName: 'eligible_team', percentage: 10 },
      { employeeName: 'Asma Ali', roleName: 'eligible_team', percentage: 10 },
    ],
  },
  {
    name: 'Polaris CRM migration',
    clientName: 'Polaris Co.',
    categorySlug: 'external',
    departmentSlug: 'engineering',
    revenueUsd: 18_000,
    status: 'in_billing',
    startDate: '2026-03-10',
    assignments: [
      { employeeName: 'Bilal Khan', roleName: 'winner', percentage: 50 },
      { employeeName: 'Maryam Iqbal', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Junaid Akhtar', roleName: 'eligible_team', percentage: 10 },
      { employeeName: 'Sara Nadeem', roleName: 'eligible_team', percentage: 10 },
    ],
  },
  {
    name: 'Vector Studio — brand site',
    clientName: 'Vector Studio',
    categorySlug: 'external',
    departmentSlug: 'engineering',
    revenueUsd: 4_500,
    status: 'completed',
    startDate: '2026-01-12',
    assignments: [
      { employeeName: 'Maryam Iqbal', roleName: 'winner', percentage: 50 },
      { employeeName: 'Bilal Khan', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Sara Nadeem', roleName: 'eligible_team', percentage: 20 },
    ],
  },

  // Engineering / Upwork
  {
    name: 'Sterling — SaaS dashboard',
    clientName: 'Sterling Holdings',
    categorySlug: 'upwork',
    departmentSlug: 'engineering',
    revenueUsd: 9_400,
    status: 'in_billing',
    startDate: '2026-04-05',
    assignments: [
      { employeeName: 'Sana Akram', roleName: 'winner', percentage: 58 },
      { employeeName: 'Maryam Iqbal', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Sara Nadeem', roleName: 'eligible_team', percentage: 12 },
    ],
  },
  {
    name: 'GreenLeaf — eCommerce',
    clientName: 'GreenLeaf Co.',
    categorySlug: 'upwork',
    departmentSlug: 'engineering',
    revenueUsd: 6_200,
    status: 'on_hold',
    startDate: '2026-02-20',
    notes: 'Client invoice overdue — placed on hold mid-month.',
    assignments: [
      {
        employeeName: 'Maira Khan' /* name absent in seed — fall back */,
        roleName: 'winner',
        percentage: 58,
      },
      { employeeName: 'Sana Akram', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Bilal Khan', roleName: 'eligible_team', percentage: 12 },
    ],
  },
  {
    name: 'Pixel Co. — mobile app',
    clientName: 'Pixel Co.',
    categorySlug: 'upwork',
    departmentSlug: 'engineering',
    revenueUsd: 5_500,
    status: 'in_billing',
    startDate: '2026-03-15',
    assignments: [
      { employeeName: 'Sana Akram', roleName: 'winner', percentage: 58 },
      { employeeName: 'Maryam Iqbal', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Sara Nadeem', roleName: 'eligible_team', percentage: 12 },
    ],
  },

  // Engineering / B2B
  {
    name: 'Northwind partnership Q2',
    clientName: 'Northwind Bank',
    categorySlug: 'b2b',
    departmentSlug: 'engineering',
    revenueUsd: 24_000,
    status: 'in_billing',
    startDate: '2026-04-01',
    assignments: [
      { employeeName: 'Talha Ahmed', roleName: 'winner', percentage: 70 },
      { employeeName: 'Omar Sheikh', roleName: 'communicator', percentage: 30 },
    ],
  },
  {
    name: 'Helix Labs — platform retainer',
    clientName: 'Helix Labs',
    categorySlug: 'b2b',
    departmentSlug: 'engineering',
    revenueUsd: 9_000,
    status: 'completed',
    startDate: '2026-01-05',
    assignments: [
      { employeeName: 'Talha Ahmed', roleName: 'winner', percentage: 70 },
      { employeeName: 'Faisal Hussain', roleName: 'communicator', percentage: 30 },
    ],
  },
  {
    name: 'Nimbus AI integration',
    clientName: 'Nimbus AI',
    categorySlug: 'b2b',
    departmentSlug: 'engineering',
    revenueUsd: 32_000,
    status: 'active',
    startDate: '2026-05-01',
    assignments: [
      { employeeName: 'Bilal Khan', roleName: 'winner', percentage: 70 },
      { employeeName: 'Maryam Iqbal', roleName: 'communicator', percentage: 30 },
    ],
  },

  // Business Development / External
  {
    name: 'Acme — strategic intro',
    clientName: 'Acme Inc.',
    categorySlug: 'external',
    departmentSlug: 'business-development',
    revenueUsd: 6_000,
    status: 'completed',
    startDate: '2026-02-01',
    assignments: [
      { employeeName: 'Sana Akram', roleName: 'winner', percentage: 85 },
      { employeeName: 'Talha Ahmed', roleName: 'communicator', percentage: 12 },
      { employeeName: 'Ayesha Malik', roleName: 'eligible_team', percentage: 3 },
    ],
  },

  // Business Development / Upwork
  {
    name: 'TideRise outbound — Q1',
    clientName: 'TideRise',
    categorySlug: 'upwork',
    departmentSlug: 'business-development',
    revenueUsd: 8_500,
    status: 'in_billing',
    startDate: '2026-03-12',
    assignments: [
      { employeeName: 'Sana Akram', roleName: 'winner', percentage: 85 },
      { employeeName: 'Talha Ahmed', roleName: 'communicator', percentage: 10 },
      { employeeName: 'Ayesha Malik', roleName: 'eligible_team', percentage: 5 },
    ],
  },

  // Operations / External
  {
    name: 'Acme onboarding ops',
    clientName: 'Acme Inc.',
    categorySlug: 'external',
    departmentSlug: 'operations',
    revenueUsd: 3_200,
    status: 'in_billing',
    startDate: '2026-04-15',
    assignments: [
      { employeeName: 'Noor ul Ain', roleName: 'winner', percentage: 60 },
      { employeeName: 'Hassan Riaz', roleName: 'communicator', percentage: 40 },
    ],
  },

  // Operations / Upwork
  {
    name: 'Sterling support ops',
    clientName: 'Sterling Holdings',
    categorySlug: 'upwork',
    departmentSlug: 'operations',
    revenueUsd: 4_400,
    status: 'in_billing',
    startDate: '2026-04-10',
    assignments: [
      { employeeName: 'Noor ul Ain', roleName: 'winner', percentage: 60 },
      { employeeName: 'Hassan Riaz', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Ayesha Malik', roleName: 'eligible_team', percentage: 10 },
    ],
  },

  // A draft and a cancelled to round out the status taxonomy
  {
    name: 'Stratus — discovery sprint',
    clientName: 'Stratus AI',
    categorySlug: 'external',
    departmentSlug: 'engineering',
    revenueUsd: 7_500,
    status: 'draft',
    startDate: '2026-06-01',
    assignments: [
      { employeeName: 'Bilal Khan', roleName: 'winner', percentage: 50 },
      { employeeName: 'Maryam Iqbal', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Sara Nadeem', roleName: 'eligible_team', percentage: 20 },
    ],
  },
  {
    name: 'OldCorp legacy migration',
    clientName: 'OldCorp',
    categorySlug: 'external',
    departmentSlug: 'engineering',
    revenueUsd: 15_000,
    status: 'cancelled',
    startDate: '2026-02-15',
    notes: 'Client cancelled mid-discovery.',
    assignments: [
      { employeeName: 'Asma Ali', roleName: 'winner', percentage: 50 },
      { employeeName: 'Bilal Khan', roleName: 'communicator', percentage: 30 },
      { employeeName: 'Junaid Akhtar', roleName: 'eligible_team', percentage: 20 },
    ],
  },
];

export async function seedPhase2(prisma: PrismaClient, superAdminUserId: string): Promise<void> {
  console.info('[phase2] Seeding project categories...');
  // Two-pass so parent ids resolve when sub-categories arrive.
  const bySlug = new Map<string, string>();
  for (const cat of CATEGORIES.filter((c) => !c.parentSlug)) {
    const row = await prisma.projectCategory.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        archived: cat.archived ?? false,
      },
      update: {
        name: cat.name,
        description: cat.description,
        color: cat.color,
        archived: cat.archived ?? false,
      },
    });
    bySlug.set(cat.slug, row.id);
  }
  for (const cat of CATEGORIES.filter((c) => c.parentSlug)) {
    const parentId = bySlug.get(cat.parentSlug!);
    if (!parentId) {
      console.warn(`[phase2] Skipping sub-category ${cat.slug}: parent ${cat.parentSlug} missing`);
      continue;
    }
    const row = await prisma.projectCategory.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        archived: cat.archived ?? false,
        parentId,
      },
      update: {
        name: cat.name,
        description: cat.description,
        color: cat.color,
        archived: cat.archived ?? false,
        parentId,
      },
    });
    bySlug.set(cat.slug, row.id);
  }

  console.info('[phase2] Seeding commission rules...');
  const ruleBySlot = new Map<string, string>(); // key: `${deptSlug}|${categorySlug}`
  for (const r of RULES) {
    const categoryId = bySlug.get(r.categorySlug);
    if (!categoryId) {
      console.warn(`[phase2] Skipping rule for missing category ${r.categorySlug}`);
      continue;
    }
    const slotKey = `${r.departmentSlug}|${r.categorySlug}`;
    // Idempotent — keyed on unique (department, categoryId, version='1.0').
    const row = await prisma.commissionRule.upsert({
      where: {
        department_categoryId_version: {
          department: r.departmentSlug,
          categoryId,
          version: '1.0',
        },
      },
      create: {
        department: r.departmentSlug,
        categoryId,
        version: '1.0',
        poolMode: r.poolMode,
        poolValue: new Prisma.Decimal(r.poolValue),
        rolePercentages: r.rolePercentages as unknown as Prisma.InputJsonValue,
        disbursementSchedule: Prisma.DbNull,
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
        status: r.status ?? 'active',
        pendingReason: r.pendingReason ?? null,
        createdById: superAdminUserId,
        publishedAt: r.status === 'pending' ? null : new Date('2026-01-01T00:00:00Z'),
        publishedById: r.status === 'pending' ? null : superAdminUserId,
      },
      update: {
        poolValue: new Prisma.Decimal(r.poolValue),
        rolePercentages: r.rolePercentages as unknown as Prisma.InputJsonValue,
        status: r.status ?? 'active',
        pendingReason: r.pendingReason ?? null,
      },
    });
    ruleBySlot.set(slotKey, row.id);
  }

  console.info('[phase2] Seeding sample projects + assignments...');
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, departmentId: true },
  });
  const empByName = new Map(employees.map((e) => [e.fullName, e]));
  const departments = await prisma.department.findMany();
  const deptBySlug = new Map(departments.map((d) => [d.slug, d]));

  for (const p of PROJECTS) {
    const category = bySlug.get(p.categorySlug);
    const dept = deptBySlug.get(p.departmentSlug);
    if (!category || !dept) {
      console.warn(`[phase2] Skipping project ${p.name}: missing category or department`);
      continue;
    }
    const ruleId = ruleBySlot.get(`${p.departmentSlug}|${p.categorySlug}`);
    if (!ruleId) {
      console.warn(
        `[phase2] Skipping project ${p.name}: no rule for ${p.departmentSlug}/${p.categorySlug}`,
      );
      continue;
    }

    // Resolve assignments. Drop unknown names with a warning rather
    // than throwing — Maira Khan in the design list isn't in seed.ts.
    const resolved = p.assignments
      .map((a) => {
        const emp = empByName.get(a.employeeName);
        if (!emp) {
          console.warn(
            `[phase2] ${p.name}: skipping assignment for ${a.employeeName} (not seeded)`,
          );
          return null;
        }
        return { ...a, employeeId: emp.id };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    // Idempotency: skip if a project with the same name already exists.
    const existing = await prisma.project.findFirst({ where: { name: p.name } });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: p.name,
          clientName: p.clientName,
          categoryId: category,
          departmentId: dept.id,
          commissionRuleId: ruleId,
          revenueUsd: new Prisma.Decimal(p.revenueUsd),
          status: p.status,
          startDate: new Date(p.startDate),
          notes: p.notes ?? null,
          createdById: superAdminUserId,
        },
      });
      for (const a of resolved) {
        await tx.projectAssignment.create({
          data: {
            projectId: project.id,
            employeeId: a.employeeId,
            roleName: a.roleName,
            percentage: new Prisma.Decimal(a.percentage),
            assignedById: superAdminUserId,
          },
        });
      }
    });
  }

  await seedCommissionRuns(prisma, superAdminUserId);

  console.info('[phase2] Seed complete.');
}

/* ----------------------------------------------------------------
 * Sample commission runs.
 *
 * Creates two runs for the current month and the previous one:
 *   - previous month → approved + locked-equivalent (status='approved')
 *   - current month → draft
 *
 * Idempotent: skip if a run already exists for the target monthKey.
 * Uses the same calculation engine the runtime service does so the
 * seed exercises the math end-to-end.
 * ---------------------------------------------------------------- */
async function seedCommissionRuns(prisma: PrismaClient, superAdminUserId: string): Promise<void> {
  console.info('[phase2] Seeding sample commission runs...');

  const now = new Date();
  const thisMonth = monthKeyOf(now);
  const prevMonth = previousMonthKeyOf(thisMonth);

  // Pull projects + their rule + active assignments for the calc engine.
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: { in: ['active', 'in_billing', 'on_hold'] } },
    include: {
      commissionRule: true,
      assignments: { where: { removedAt: null } },
    },
  });
  const calcProjects = projects.map((p) => ({
    id: p.id,
    revenueUsd: Number(p.revenueUsd),
    status: p.status,
    startDate: p.startDate,
    expectedCompletionDate: p.expectedCompletionDate,
    rule: {
      poolMode: p.commissionRule.poolMode as 'percentage' | 'fixed',
      poolValue: Number(p.commissionRule.poolValue),
      minProjectRevenueUsd: Number(p.commissionRule.minProjectRevenueUsd),
    },
    assignments: p.assignments.map((a) => ({
      employeeId: a.employeeId,
      roleName: a.roleName,
      percentage: Number(a.percentage),
    })),
  }));

  async function ensureRun(
    monthKey: string,
    status: 'draft' | 'pending_approval' | 'approved',
  ): Promise<void> {
    const existing = await prisma.commissionRun.findUnique({ where: { monthKey } });
    if (existing) {
      console.info(
        `[phase2] Run for ${monthKey} already exists (status=${existing.status}); skipping`,
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      const run = await tx.commissionRun.create({
        data: {
          monthKey,
          fxRateUsdToPkr: new Prisma.Decimal(0.0035),
          status: 'draft',
          createdById: superAdminUserId,
          notes: `Seeded ${monthKey} run.`,
        },
      });

      const lineItems: Prisma.CommissionLineItemCreateManyInput[] = [];
      for (const project of calcProjects) {
        const items = calcProjectLineItems(project, { monthKey });
        for (const item of items) {
          lineItems.push({
            runId: run.id,
            projectId: item.projectId,
            employeeId: item.employeeId,
            roleName: item.roleName,
            snapshotPercentage: new Prisma.Decimal(item.snapshotPercentage),
            baseRevenueUsd: new Prisma.Decimal(item.baseRevenueUsd),
            monthFractionNumerator: item.monthFractionNumerator,
            monthFractionDenominator: item.monthFractionDenominator,
            calculatedAmountUsd: new Prisma.Decimal(item.calculatedAmountUsd),
            leaveAdjustmentUsd: new Prisma.Decimal(0),
            manualAdjustmentUsd: new Prisma.Decimal(0),
            isHeld: false,
            finalAmountUsd: new Prisma.Decimal(item.calculatedAmountUsd),
          });
        }
      }
      if (lineItems.length > 0) {
        await tx.commissionLineItem.createMany({ data: lineItems, skipDuplicates: true });
      }

      // Optionally take the run through submit / approve to land a
      // realistic sample. Audit log captures the transitions; the
      // timeline subscriber lands the per-employee rows via the
      // commission.run.approved event when the API is up — for seed
      // we set the lifecycle columns directly.
      if (status === 'pending_approval') {
        await tx.commissionRun.update({
          where: { id: run.id },
          data: {
            status: 'pending_approval',
            submittedAt: new Date(),
            submittedById: superAdminUserId,
            notes: 'Submitted by HR — awaiting Finance approval.',
          },
        });
      }
      if (status === 'approved') {
        const expectedPhrase = `APPROVE ${monthLabel(monthKey).toUpperCase()}`;
        await tx.commissionRun.update({
          where: { id: run.id },
          data: {
            status: 'approved',
            submittedAt: new Date(),
            submittedById: superAdminUserId,
            approvedAt: new Date(),
            approvedById: superAdminUserId,
            approverIsSubmitter: true,
            approvalConfirmationPhrase: expectedPhrase,
          },
        });
      }
    });

    console.info(`[phase2] Created ${monthKey} run with status=${status}`);
  }

  const twoMonthsBack = previousMonthKeyOf(prevMonth);

  // Three-state lifecycle sample so the UIs (Approvals inbox,
  // dashboard widgets, run detail) all have realistic data:
  //   - 2 months back → approved (a sealed historical run)
  //   - 1 month back → pending_approval (sits in the Approvals inbox)
  //   - this month → draft (HR is currently reviewing)
  await ensureRun(twoMonthsBack, 'approved');
  await ensureRun(prevMonth, 'pending_approval');
  await ensureRun(thisMonth, 'draft');

  await enrichDraftWithSampleAdjustments(prisma, thisMonth);
}

/**
 * Adds demo-quality variety to the draft run: marks one line item as
 * held (so the carry-forward KPI > 0) and applies a -$24 leave-adj
 * to another (mirroring the PNG-09 example). Idempotent — looks for
 * the flag on the row before mutating.
 */
async function enrichDraftWithSampleAdjustments(
  prisma: PrismaClient,
  draftMonthKey: string,
): Promise<void> {
  const run = await prisma.commissionRun.findUnique({
    where: { monthKey: draftMonthKey },
    include: { lineItems: { orderBy: { calculatedAmountUsd: 'desc' } } },
  });
  if (!run || run.status !== 'draft' || run.lineItems.length < 2) return;

  const alreadyHeld = run.lineItems.find((li) => li.isHeld);
  const alreadyAdjusted = run.lineItems.find((li) => Number(li.leaveAdjustmentUsd) !== 0);
  if (alreadyHeld && alreadyAdjusted) return;

  if (!alreadyHeld) {
    const candidate = run.lineItems[0]; // biggest line — most visible
    await prisma.commissionLineItem.update({
      where: { id: candidate.id },
      data: {
        isHeld: true,
      },
    });
    console.info(`[phase2] Held sample line item ${candidate.id} for carry-forward demo`);
  }

  if (!alreadyAdjusted) {
    const candidate = run.lineItems[1] ?? run.lineItems[0];
    const leave = -24;
    const calculated = Number(candidate.calculatedAmountUsd);
    const final = Math.round((calculated + leave) * 100) / 100;
    await prisma.commissionLineItem.update({
      where: { id: candidate.id },
      data: {
        leaveAdjustmentUsd: new Prisma.Decimal(leave),
        finalAmountUsd: new Prisma.Decimal(final),
      },
    });
    console.info(`[phase2] Applied -$24 leave-adj to sample line item ${candidate.id}`);
  }
}

function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKeyOf(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid monthKey: ${monthKey}`);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return monthKeyOf(d);
}
