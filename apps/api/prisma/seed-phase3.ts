/**
 * Phase 3 seed — 8 sample reminder rules matching the design's rule library.
 *
 * Idempotent: if a rule with the given `key` already exists (any status),
 * we skip it. Re-running the seed never duplicates.
 *
 * Run with:
 *   set -a; . .env.local; set +a
 *   pnpm --filter @futurenostics/api exec tsx prisma/seed-phase3.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RuleSeed {
  key: string;
  name: string;
  description: string;
  departmentSlug: string | null; // null = org-wide
  isEnabled: boolean;
  triggerType: 'event' | 'cron';
  triggerSpec: unknown;
  notificationType: string;
  recipientResolver: string;
}

const RULES: RuleSeed[] = [
  {
    key: 'probation-end-eng',
    name: 'Probation end',
    description: 'Notify HR and the direct manager 14 days before an Engineering probation ends.',
    departmentSlug: 'engineering',
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {
      kind: 'event',
      eventType: 'employee.created',
      relativeTo: 'probationEndDate',
      offset: '-P14D',
    },
    notificationType: 'reminders.probation-ending',
    recipientResolver: 'manager+hr',
  },
  {
    key: 'probation-end-bd',
    name: 'Probation end',
    description:
      'Notify HR and the BD managers 14 days before a Business Development probation ends.',
    departmentSlug: 'business-development',
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {
      kind: 'event',
      eventType: 'employee.created',
      relativeTo: 'probationEndDate',
      offset: '-P14D',
    },
    notificationType: 'reminders.probation-ending',
    recipientResolver: 'bd-managers',
  },
  {
    key: 'internship-end',
    name: 'Internship end',
    description: '14 days before an internship end-date, ping the direct manager.',
    departmentSlug: null,
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {
      kind: 'event',
      eventType: 'employee.created',
      relativeTo: 'internshipEndDate',
      offset: '-P14D',
    },
    notificationType: 'reminders.internship-ending',
    recipientResolver: 'manager+hr',
  },
  {
    key: 'annual-review',
    name: 'Annual review',
    description:
      'Open the annual review window 21 days before the joinDate anniversary. Loops in the manager and the employee.',
    departmentSlug: null,
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {
      kind: 'event',
      eventType: 'employee.created',
      relativeTo: 'joinDate',
      offset: '-P21D',
    },
    notificationType: 'reminders.annual-review',
    recipientResolver: 'manager+employee',
  },
  {
    key: 'biannual-review-eng',
    name: 'Biannual review',
    description: '14 days before each biannual review for Engineering.',
    departmentSlug: 'engineering',
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {
      kind: 'event',
      eventType: 'employee.created',
      relativeTo: 'joinDate',
      offset: '-P14D',
    },
    notificationType: 'reminders.biannual-review',
    recipientResolver: 'direct-manager',
  },
  {
    key: 'birthday-team',
    name: 'Birthday',
    description: 'Notify the team at 09:00 PKT on a teammate’s birthday.',
    departmentSlug: null,
    isEnabled: true,
    triggerType: 'cron',
    triggerSpec: {
      kind: 'cron',
      cron: '0 9 * * *',
      query: { kind: 'birthday' },
    },
    notificationType: 'reminders.birthday',
    recipientResolver: 'dept-employees',
  },
  {
    key: 'work-anniversary',
    name: 'Work anniversary',
    description: 'On the day, notify the direct manager so a quick celebration can happen.',
    departmentSlug: null,
    isEnabled: true,
    triggerType: 'cron',
    triggerSpec: {
      kind: 'cron',
      cron: '0 9 * * *',
      query: { kind: 'work-anniversary' },
    },
    notificationType: 'reminders.work-anniversary',
    recipientResolver: 'direct-manager',
  },
  {
    key: 'visa-renewal',
    name: 'Custom — visa renewal',
    description: '90 days before a tracked visa expires (Engineering).',
    departmentSlug: 'engineering',
    isEnabled: false, // matches design's OFF toggle
    triggerType: 'cron',
    triggerSpec: {
      kind: 'cron',
      cron: '0 6 * * *',
      query: { kind: 'document-expiring', withinDays: 90 },
    },
    notificationType: 'reminders.visa-renewal',
    recipientResolver: 'dept-employees',
  },
];

async function main(): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@futurenostics.local' },
    select: { id: true },
  });
  if (!admin) throw new Error('Seed expects the admin user to exist (run prisma/seed.ts first).');

  const depts = await prisma.department.findMany({ select: { id: true, slug: true } });
  const deptBySlug = new Map(depts.map((d) => [d.slug, d.id]));

  for (const r of RULES) {
    const existing = await prisma.reminderRule.findFirst({ where: { key: r.key } });
    if (existing) {
      console.log(`✓ reminder rule "${r.key}" already exists (id=${existing.id}); skipping`);
      continue;
    }
    const departmentId = r.departmentSlug ? (deptBySlug.get(r.departmentSlug) ?? null) : null;
    if (r.departmentSlug && !departmentId) {
      console.warn(
        `! reminder rule "${r.key}" wants dept "${r.departmentSlug}" but no such department; will be org-wide`,
      );
    }
    const created = await prisma.reminderRule.create({
      data: {
        key: r.key,
        name: r.name,
        description: r.description,
        status: 'active',
        isEnabled: r.isEnabled,
        departmentId,
        triggerType: r.triggerType,
        triggerSpec: r.triggerSpec as never,
        notificationType: r.notificationType,
        recipientResolver: r.recipientResolver,
        version: '1.0',
        effectiveFrom: new Date(),
        publishedAt: new Date(),
        publishedById: admin.id,
        createdById: admin.id,
      },
    });
    console.log(`+ seeded "${r.key}" (id=${created.id}) status=${created.status}`);
  }
  console.log(`done — ${RULES.length} rules processed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
