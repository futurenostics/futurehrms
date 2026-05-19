/**
 * Recipient-resolver integration tests.
 *
 * Covers:
 *   - the parameterised resolvers added in Step B (specific-employees,
 *     role-members, relation)
 *   - the multi-source `resolveMany` dispatcher: union, dedup, and
 *     soft-fail on misconfigured entries
 *   - the legacy single-string `readRecipientEntries` fallback
 *
 * Hits a real Prisma connection (matching the approvals.service.spec
 * + registry.service.spec convention). Each test bootstraps the
 * minimum graph it needs (one or two employees + users) and tears it
 * down via the `recipient-spec-` prefix on every created row.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@futurenostics/db';
import type { ReminderRule } from '@prisma/client';
import {
  RecipientResolverRegistry,
  readRecipientEntries,
  type RecipientEntry,
} from './recipient-resolver';

const SUFFIX = randomUUID().slice(0, 8);
const tag = (s: string) => `recipient-spec-${SUFFIX}-${s}`;

let registry: RecipientResolverRegistry;
let deptId: string;
let statusId: string;
let designationId: string;
let managerEmpId: string;
let managerUserId: string;
let reportEmpId: string;
let reportUserId: string;
let specialEmpId: string;
let specialUserId: string;
let testRoleSlug: string;

async function fakeRule(): Promise<ReminderRule> {
  // Build a minimal in-memory ReminderRule so we don't have to seed
  // the table for every test. The resolvers only read departmentId,
  // recipientResolver, and recipientResolvers off the row.
  return {
    id: tag('rule'),
    key: tag('rule'),
    name: 'spec rule',
    description: null,
    status: 'draft',
    departmentId: null,
    isEnabled: true,
    triggerType: 'event',
    triggerSpec: {} as never,
    notificationType: 'reminders.test',
    recipientResolver: 'self',
    recipientResolvers: null,
    version: '1.0',
    effectiveFrom: null,
    effectiveTo: null,
    publishedAt: null,
    publishedById: null,
    createdAt: new Date(),
    createdById: tag('actor'),
    deletedAt: null,
  };
}

beforeAll(async () => {
  registry = new RecipientResolverRegistry();

  // One department + status + designation reused across employees.
  const dept = await prisma.department.create({
    data: { name: tag('Dept'), slug: tag('dept-slug') },
  });
  deptId = dept.id;
  const status = await prisma.employeeStatus.create({
    data: { name: tag('Active'), slug: tag('active-slug'), isTerminal: false },
  });
  statusId = status.id;
  const designation = await prisma.designation.create({
    data: { name: tag('Engineer'), departmentId: deptId },
  });
  designationId = designation.id;

  // Manager + report pair.
  const managerEmp = await prisma.employee.create({
    data: {
      eid: tag('M01'),
      fullName: 'Spec Manager',
      email: `${tag('manager')}@spec.local`,
      departmentId: deptId,
      designationId,
      statusId,
      joinDate: new Date('2020-01-01'),
      contractType: 'permanent',
    },
  });
  managerEmpId = managerEmp.id;
  const managerUser = await prisma.user.create({
    data: {
      email: `${tag('manager-u')}@spec.local`,
      passwordHash: 'x',
      isActive: true,
      employeeId: managerEmp.id,
    },
  });
  managerUserId = managerUser.id;

  const reportEmp = await prisma.employee.create({
    data: {
      eid: tag('R01'),
      fullName: 'Spec Report',
      email: `${tag('report')}@spec.local`,
      departmentId: deptId,
      designationId,
      statusId,
      managerId: managerEmp.id,
      joinDate: new Date('2024-01-01'),
      contractType: 'permanent',
    },
  });
  reportEmpId = reportEmp.id;
  const reportUser = await prisma.user.create({
    data: {
      email: `${tag('report-u')}@spec.local`,
      passwordHash: 'x',
      isActive: true,
      employeeId: reportEmp.id,
    },
  });
  reportUserId = reportUser.id;

  // A separate employee used for specific-employees tests.
  const specialEmp = await prisma.employee.create({
    data: {
      eid: tag('S01'),
      fullName: 'Spec Special',
      email: `${tag('special')}@spec.local`,
      departmentId: deptId,
      designationId,
      statusId,
      joinDate: new Date('2024-06-01'),
      contractType: 'permanent',
    },
  });
  specialEmpId = specialEmp.id;
  const specialUser = await prisma.user.create({
    data: {
      email: `${tag('special-u')}@spec.local`,
      passwordHash: 'x',
      isActive: true,
      employeeId: specialEmp.id,
    },
  });
  specialUserId = specialUser.id;

  // Custom role used by role-members tests.
  testRoleSlug = tag('test-role');
  const role = await prisma.role.create({
    data: { slug: testRoleSlug, name: tag('Test Role'), description: 'spec' },
  });
  await prisma.userRole.create({
    data: { userId: managerUser.id, roleId: role.id },
  });
  await prisma.userRole.create({
    data: { userId: specialUser.id, roleId: role.id },
  });
});

afterAll(async () => {
  // Cleanup respecting FK order.
  await prisma.userRole.deleteMany({ where: { role: { slug: testRoleSlug } } });
  await prisma.role.deleteMany({ where: { slug: testRoleSlug } });
  await prisma.user.deleteMany({
    where: { employee: { eid: { startsWith: tag('') } } },
  });
  await prisma.employee.deleteMany({ where: { eid: { startsWith: tag('') } } });
  await prisma.designation.deleteMany({ where: { id: designationId } });
  await prisma.employeeStatus.deleteMany({ where: { id: statusId } });
  await prisma.department.deleteMany({ where: { id: deptId } });
  await prisma.$disconnect();
});

/* ---------- specific-employees ---------- */

describe('specific-employees', () => {
  it('returns the user ids belonging to the listed employees', async () => {
    const rule = await fakeRule();
    const ids = await registry.resolve('specific-employees', rule, null, {
      employeeIds: [reportEmpId, specialEmpId],
    });
    expect(ids.sort()).toEqual([reportUserId, specialUserId].sort());
  });
  it('empty employeeIds → empty list', async () => {
    const rule = await fakeRule();
    expect(await registry.resolve('specific-employees', rule, null, { employeeIds: [] })).toEqual(
      [],
    );
  });
});

/* ---------- role-members ---------- */

describe('role-members', () => {
  it('returns every user holding the given role', async () => {
    const rule = await fakeRule();
    const ids = await registry.resolve('role-members', rule, null, { roleSlug: testRoleSlug });
    expect(ids.sort()).toEqual([managerUserId, specialUserId].sort());
  });
  it('unknown slug → empty', async () => {
    const rule = await fakeRule();
    expect(
      await registry.resolve('role-members', rule, null, { roleSlug: 'does-not-exist' }),
    ).toEqual([]);
  });
});

/* ---------- relation ---------- */

describe('relation', () => {
  it("manager relation resolves to the source employee's manager", async () => {
    const rule = await fakeRule();
    const ids = await registry.resolve(
      'relation',
      rule,
      { kind: 'employee', id: reportEmpId },
      { relation: 'manager' },
    );
    expect(ids).toEqual([managerUserId]);
  });
  it('reports relation returns every direct report', async () => {
    const rule = await fakeRule();
    const ids = await registry.resolve(
      'relation',
      rule,
      { kind: 'employee', id: managerEmpId },
      { relation: 'reports' },
    );
    expect(ids).toEqual([reportUserId]);
  });
  it('self relation returns the source user', async () => {
    const rule = await fakeRule();
    const ids = await registry.resolve(
      'relation',
      rule,
      { kind: 'employee', id: specialEmpId },
      { relation: 'self' },
    );
    expect(ids).toEqual([specialUserId]);
  });
});

/* ---------- resolveMany ---------- */

describe('resolveMany', () => {
  it('unions every entry and dedups overlapping results', async () => {
    const rule = await fakeRule();
    const entries: RecipientEntry[] = [
      { kind: 'specific-employees', config: { employeeIds: [reportEmpId] } },
      { kind: 'role-members', config: { roleSlug: testRoleSlug } }, // mgr + special
      { kind: 'relation', config: { relation: 'self' } }, // adds the source if source is set
    ];
    const ids = await registry.resolveMany(entries, rule, { kind: 'employee', id: reportEmpId });
    // Expected union: reportUser (from specific + self), managerUser + specialUser (from role).
    expect(ids.sort()).toEqual([reportUserId, managerUserId, specialUserId].sort());
  });
  it('soft-fails on an unknown kind without breaking the rest', async () => {
    const rule = await fakeRule();
    const entries: RecipientEntry[] = [
      { kind: 'no-such-kind' },
      { kind: 'specific-employees', config: { employeeIds: [specialEmpId] } },
    ];
    const ids = await registry.resolveMany(entries, rule, null);
    expect(ids).toEqual([specialUserId]);
  });
});

/* ---------- legacy fallback ---------- */

describe('readRecipientEntries', () => {
  it('returns the new array when present', async () => {
    const rule = await fakeRule();
    rule.recipientResolvers = [{ kind: 'self' }, { kind: 'hr-admins' }] as never;
    const entries = readRecipientEntries(rule);
    expect(entries).toEqual([{ kind: 'self' }, { kind: 'hr-admins' }]);
  });
  it('falls back to a single entry built from the legacy column', async () => {
    const rule = await fakeRule();
    rule.recipientResolvers = null;
    rule.recipientResolver = 'manager+hr';
    const entries = readRecipientEntries(rule);
    expect(entries).toEqual([{ kind: 'manager+hr' }]);
  });
  it('drops malformed array entries and continues', async () => {
    const rule = await fakeRule();
    rule.recipientResolvers = [
      { kind: 'self' },
      { kind: '' }, // dropped
      'string-is-not-an-entry', // dropped
      { kind: 'specific-employees', config: { employeeIds: ['x'] } },
    ] as never;
    const entries = readRecipientEntries(rule);
    expect(entries.map((e) => e.kind)).toEqual(['self', 'specific-employees']);
  });
});
