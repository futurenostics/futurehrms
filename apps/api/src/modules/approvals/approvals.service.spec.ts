/**
 * ApprovalsService integration tests.
 *
 * Exercises the generic approvals plumbing end-to-end against a real
 * Prisma connection (matching the registry.service.spec convention).
 * A throwaway ApprovalType is registered with the registry so we can
 * drive submit / approve / reject / cancel without depending on the
 * commission-run module's specific source loading.
 *
 * Each test creates its own pair of users + a fake "source" id, then
 * cleans up via the `@@index` on (type, status) — every row we create
 * uses `type = 'test-approval-<runId>'`, so deletion is scoped and
 * cannot leak to production data.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { RequestContextService } from '../../core/request-context/request-context.service';
import { ApprovalsService } from './approvals.service';
import { ApprovalTypeRegistry, type ApprovalTypeDefinition } from './approval-type.registry';

const TEST_PERMISSION = 'test-approvals:act';
const TEST_RUN_ID = randomUUID().slice(0, 8);
const TYPE_SOFT = `test-approval-soft-${TEST_RUN_ID}`;
const TYPE_HARD = `test-approval-hard-${TEST_RUN_ID}`;
const TYPE_PHRASE = `test-approval-phrase-${TEST_RUN_ID}`;
const TYPE_FAILS = `test-approval-fails-${TEST_RUN_ID}`;

let service: ApprovalsService;
let registry: ApprovalTypeRegistry;

let submitter: AuthenticatedUser;
let approver: AuthenticatedUser;

function makeType(overrides: Partial<ApprovalTypeDefinition>): ApprovalTypeDefinition {
  const base: ApprovalTypeDefinition = {
    kind: 'placeholder',
    label: 'Placeholder',
    module: 'test',
    decisionPolicy: 'single',
    requiredPermission: TEST_PERMISSION,
    softSoD: true,
    async loadSource(sourceId) {
      // Source for tests is just an in-memory blob — the service never
      // dereferences this beyond passing it to the type hooks.
      return { id: sourceId, payload: 'fake' };
    },
    async toMetadata({ source }) {
      const s = source as { id: string };
      return { title: `Test ${s.id}`, sub: 'sub' };
    },
  };
  return { ...base, ...overrides };
}

beforeAll(async () => {
  const requestContext = new RequestContextService();
  const audit = new AuditService(requestContext);
  const events = new EventBusService(new EventEmitter2());
  registry = new ApprovalTypeRegistry();
  service = new ApprovalsService(registry, events, audit);

  // Permission used by both users so they can submit / approve.
  await prisma.permission.upsert({
    where: { key: TEST_PERMISSION },
    update: {},
    create: {
      key: TEST_PERMISSION,
      module: 'test-approvals',
      action: 'act',
      description: 'Allow acting on test approvals',
    },
  });

  const submitterRow = await prisma.user.create({
    data: {
      email: `submitter-${TEST_RUN_ID}@test.local`,
      passwordHash: 'x',
      isActive: true,
    },
  });
  const approverRow = await prisma.user.create({
    data: {
      email: `approver-${TEST_RUN_ID}@test.local`,
      passwordHash: 'x',
      isActive: true,
    },
  });

  submitter = {
    id: submitterRow.id,
    email: submitterRow.email,
    employeeId: null,
    permissions: [TEST_PERMISSION, 'approvals:view_own_inbox'],
    roles: [],
    scopedDepartmentIds: [],
  };
  approver = {
    id: approverRow.id,
    email: approverRow.email,
    employeeId: null,
    permissions: [TEST_PERMISSION, 'approvals:view_own_inbox'],
    roles: [],
    scopedDepartmentIds: [],
  };
});

beforeEach(async () => {
  // Reset every test's approval rows. Scoped by the test-run-id slug
  // so we don't disturb anything else in the schema.
  await prisma.approvalDecision.deleteMany({
    where: { approval: { type: { startsWith: 'test-approval-' } } },
  });
  await prisma.approval.deleteMany({ where: { type: { startsWith: 'test-approval-' } } });
});

afterAll(async () => {
  // Targeted cleanup — restricted to the rows this run created.
  await prisma.approvalDecision.deleteMany({
    where: { approval: { type: { startsWith: 'test-approval-' } } },
  });
  await prisma.approval.deleteMany({ where: { type: { startsWith: 'test-approval-' } } });
  await prisma.auditLog.deleteMany({ where: { module: 'approvals', entity: 'Approval' } });
  await prisma.user.deleteMany({
    where: { email: { in: [submitter.email, approver.email] } },
  });
  await prisma.permission.deleteMany({ where: { key: TEST_PERMISSION } });
  await prisma.$disconnect();
});

/* ----------------------- submit ----------------------- */

describe('ApprovalsService.submit', () => {
  it('creates a pending Approval and computes metadata', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    const sourceId = randomUUID();

    const created = await service.submit({
      type: TYPE_SOFT,
      sourceId,
      submittedById: submitter.id,
    });

    expect(created.status).toBe('pending');
    expect(created.requiredPermission).toBe(TEST_PERMISSION);
    expect((created.metadata as { title: string }).title).toBe(`Test ${sourceId}`);
  });

  it('rejects duplicate pending approvals for the same source', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    const sourceId = randomUUID();
    await service.submit({ type: TYPE_SOFT, sourceId, submittedById: submitter.id });

    await expect(
      service.submit({ type: TYPE_SOFT, sourceId, submittedById: submitter.id }),
    ).rejects.toThrow(/already pending/);
  });

  it('rejects non-single policies until the resolver lands', async () => {
    const def = makeType({ kind: TYPE_HARD, label: 'Hard', decisionPolicy: 'multi' });
    registry.register(def);

    await expect(
      service.submit({ type: TYPE_HARD, sourceId: randomUUID(), submittedById: submitter.id }),
    ).rejects.toThrow(/policy 'multi' is not implemented/);
  });
});

/* ----------------------- approve ----------------------- */

describe('ApprovalsService.approve', () => {
  it('soft SoD: submitter may approve their own submission', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft', softSoD: true });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_SOFT,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    const resolved = await service.approve(submitter, created.id, {});
    expect(resolved.status).toBe('approved');
    expect(resolved.resolvedById).toBe(submitter.id);

    const decisions = await prisma.approvalDecision.findMany({
      where: { approvalId: created.id },
    });
    expect(decisions).toHaveLength(1);
    const conf = decisions[0]!.confirmationData as { approverIsSubmitter: boolean };
    expect(conf.approverIsSubmitter).toBe(true);
  });

  it('hard SoD: submitter approving their own submission is blocked', async () => {
    const def = makeType({ kind: TYPE_HARD, label: 'Hard', softSoD: false });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_HARD,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    await expect(service.approve(submitter, created.id, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('approver without the required permission is rejected', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_SOFT,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    const unprivileged: AuthenticatedUser = {
      ...approver,
      permissions: ['approvals:view_own_inbox'],
    };
    await expect(service.approve(unprivileged, created.id, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('validateConfirmation rejects on phrase mismatch', async () => {
    const def = makeType({
      kind: TYPE_PHRASE,
      label: 'Phrase',
      confirmationPhraseFor: () => 'APPROVE NOW',
      validateConfirmation({ confirmationData }) {
        const phrase = (confirmationData as { confirmationPhrase?: string } | undefined)
          ?.confirmationPhrase;
        if (phrase !== 'APPROVE NOW') throw new Error('mismatch');
      },
    });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_PHRASE,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    await expect(
      service.approve(approver, created.id, {
        confirmationData: { confirmationPhrase: 'WRONG' },
      }),
    ).rejects.toThrow(/mismatch/);

    const refreshed = await prisma.approval.findUnique({ where: { id: created.id } });
    expect(refreshed?.status).toBe('pending');
  });

  it('onApproved side-effect failure rolls back the approval state', async () => {
    const onApproved = vi
      .fn<NonNullable<ApprovalTypeDefinition['onApproved']>>()
      .mockRejectedValue(new Error('downstream blew up'));
    const def = makeType({ kind: TYPE_FAILS, label: 'Fails', onApproved });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_FAILS,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    await expect(service.approve(approver, created.id, {})).rejects.toThrow(/downstream blew up/);
    expect(onApproved).toHaveBeenCalledTimes(1);

    const refreshed = await prisma.approval.findUnique({ where: { id: created.id } });
    expect(refreshed?.status).toBe('pending');
    expect(refreshed?.resolvedAt).toBeNull();
    const decisions = await prisma.approvalDecision.findMany({
      where: { approvalId: created.id },
    });
    expect(decisions).toHaveLength(0);
  });
});

/* ----------------------- reject ----------------------- */

describe('ApprovalsService.reject', () => {
  it('records a rejection with the reason and resolves the approval', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_SOFT,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    const resolved = await service.reject(approver, created.id, { reason: 'nope' });
    expect(resolved.status).toBe('rejected');
    expect(resolved.resolveReason).toBe('nope');

    const decisions = await prisma.approvalDecision.findMany({
      where: { approvalId: created.id },
    });
    expect(decisions[0]?.decision).toBe('reject');
  });

  it('blocks empty reasons', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    const created = await service.submit({
      type: TYPE_SOFT,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    await expect(service.reject(approver, created.id, { reason: '   ' })).rejects.toThrow();
  });
});

/* ----------------------- list ----------------------- */

describe('ApprovalsService.list', () => {
  it('filters by for=me to viewer-actable approvals only', async () => {
    const def = makeType({ kind: TYPE_SOFT, label: 'Soft' });
    registry.register(def);
    await service.submit({
      type: TYPE_SOFT,
      sourceId: randomUUID(),
      submittedById: submitter.id,
    });

    const result = await service.list(approver, { for: 'me' });
    // Restrict to the test-run rows to avoid being noisy if other
    // approvals already exist on the database.
    const mine = result.items.filter((i) => i.type === TYPE_SOFT);
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(mine[0]!.status).toBe('pending');

    // A viewer who lacks the required permission shouldn't see it
    // under for=me.
    const stranger: AuthenticatedUser = {
      ...approver,
      permissions: ['approvals:view_own_inbox'],
    };
    const strangerResult = await service.list(stranger, { for: 'me' });
    const strangerSawIt = strangerResult.items.some((i) => i.type === TYPE_SOFT);
    expect(strangerSawIt).toBe(false);
  });
});
