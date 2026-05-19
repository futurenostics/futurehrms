/**
 * Reminder rule service — CRUD + publish + archive + trigger-test.
 *
 * Versioning policy (mirrors CommissionRulesService):
 *   - draft rules are mutable via update.
 *   - publishing a draft stamps effectiveTo on the existing active
 *     version for the same `key`, bumps the version (semver-minor),
 *     and flips the draft to active.
 *   - active rules are immutable. To edit, draft a new version off the
 *     active one (createDraftFrom) and publish that.
 *   - archive flips an active rule to archived (effectiveTo stamped).
 *
 * The scheduler's trigger evaluator (Session 3) reads only `active`
 * rules. Already-scheduled Reminder rows keep their FK to whatever
 * rule version was active when they were inserted — past behavior
 * stays stable across rule edits.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { triggerSpecSchema, type TriggerSpec } from './reminder-trigger.types';

export interface ReminderRulePublic {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  triggerSpec: TriggerSpec;
  notificationType: string;
  recipientResolver: string;
  version: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  publishedAt: string | null;
  publishedById: string | null;
  createdAt: string;
  createdById: string;
}

export interface CreateRuleInput {
  key: string;
  name: string;
  description?: string;
  triggerType: 'event' | 'cron';
  triggerSpec: TriggerSpec;
  notificationType: string;
  recipientResolver: string;
  /** Optional department scope — null/undefined = org-wide. */
  departmentId?: string | null;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string | null;
  triggerSpec?: TriggerSpec;
  notificationType?: string;
  recipientResolver?: string;
  departmentId?: string | null;
  isEnabled?: boolean;
}

@Injectable()
export class ReminderRulesService {
  private readonly logger = new Logger(ReminderRulesService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  private require(perm: string, viewer: AuthenticatedUser): void {
    if (!viewer.permissions.includes(perm)) {
      throw new ForbiddenException(`${perm} required`);
    }
  }

  private bumpVersion(previous?: string | null): string {
    if (!previous) return '1.0';
    const parts = previous.split('.').map((p) => Number.parseInt(p, 10));
    if (parts.length !== 2 || parts.some(Number.isNaN)) return '1.0';
    return `${parts[0]}.${parts[1] + 1}`;
  }

  /* ---------- Reads ---------- */

  async list(
    viewer: AuthenticatedUser,
    query: { status?: string; key?: string } = {},
  ): Promise<{ items: ReminderRulePublic[]; total: number }> {
    this.require('reminders:view_rules', viewer);
    const where: Prisma.ReminderRuleWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.key) where.key = query.key;

    const [rows, total] = await Promise.all([
      prisma.reminderRule.findMany({
        where,
        orderBy: [{ status: 'asc' }, { key: 'asc' }, { effectiveFrom: 'desc' }],
      }),
      prisma.reminderRule.count({ where }),
    ]);
    return { items: rows.map(toPublic), total };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<ReminderRulePublic> {
    this.require('reminders:view_rules', viewer);
    const row = await prisma.reminderRule.findUnique({ where: { id } });
    if (!row || row.deletedAt) throw new NotFoundException('Reminder rule not found');
    return toPublic(row);
  }

  /* ---------- Writes ---------- */

  async create(viewer: AuthenticatedUser, input: CreateRuleInput): Promise<ReminderRulePublic> {
    this.require('reminders:create_rule', viewer);
    const triggerSpec = triggerSpecSchema.parse(input.triggerSpec);
    if (triggerSpec.kind !== input.triggerType) {
      throw new BadRequestException(
        `triggerType '${input.triggerType}' doesn't match triggerSpec.kind '${triggerSpec.kind}'`,
      );
    }

    // New rules start at v1.0 unless there's an existing version chain
    // for the same key — in which case the next draft is minor-bumped.
    const latest = await prisma.reminderRule.findFirst({
      where: { key: input.key, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const version = this.bumpVersion(latest?.version ?? null);

    const created = await prisma.reminderRule.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        status: 'draft',
        triggerType: input.triggerType,
        triggerSpec: triggerSpec as never,
        notificationType: input.notificationType,
        recipientResolver: input.recipientResolver,
        departmentId: input.departmentId ?? null,
        version,
        createdById: viewer.id,
      },
    });
    return toPublic(created);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: UpdateRuleInput,
  ): Promise<ReminderRulePublic> {
    this.require('reminders:update_rule', viewer);
    const existing = await prisma.reminderRule.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Reminder rule not found');

    // `isEnabled` is an operational toggle and is allowed on active
    // rules (the design supports "active + muted" per the schema).
    // Every other field is content — draft-only, drafting a new
    // version is how you change an active rule.
    const contentFields = [
      'name',
      'description',
      'triggerSpec',
      'notificationType',
      'recipientResolver',
      'departmentId',
    ] as const;
    const hasContentChange = contentFields.some(
      (k) => (input as Record<string, unknown>)[k] !== undefined,
    );
    if (hasContentChange && existing.status !== 'draft') {
      throw new BadRequestException(
        'Only draft rules can be edited. Draft a new version to change an active rule.',
      );
    }

    const data: Prisma.ReminderRuleUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.notificationType !== undefined) data.notificationType = input.notificationType;
    if (input.recipientResolver !== undefined) data.recipientResolver = input.recipientResolver;
    if (input.departmentId !== undefined) {
      data.department = input.departmentId
        ? { connect: { id: input.departmentId } }
        : { disconnect: true };
    }
    if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
    if (input.triggerSpec !== undefined) {
      const triggerSpec = triggerSpecSchema.parse(input.triggerSpec);
      if (triggerSpec.kind !== existing.triggerType) {
        throw new BadRequestException(
          `Cannot change triggerType after creation — current is '${existing.triggerType}'`,
        );
      }
      data.triggerSpec = triggerSpec as never;
    }
    const updated = await prisma.reminderRule.update({ where: { id }, data });
    return toPublic(updated);
  }

  async publish(viewer: AuthenticatedUser, id: string): Promise<ReminderRulePublic> {
    this.require('reminders:publish_rule', viewer);
    const draft = await prisma.reminderRule.findUnique({ where: { id } });
    if (!draft || draft.deletedAt) throw new NotFoundException('Reminder rule not found');
    if (draft.status !== 'draft') {
      throw new BadRequestException('Only draft rules can be published');
    }

    const now = new Date();
    const published = await prisma.$transaction(async (tx) => {
      // Stamp effectiveTo on the previous active version for this key.
      await tx.reminderRule.updateMany({
        where: { key: draft.key, status: 'active' },
        data: { status: 'archived', effectiveTo: now },
      });

      const updated = await tx.reminderRule.update({
        where: { id },
        data: {
          status: 'active',
          effectiveFrom: now,
          publishedAt: now,
          publishedById: viewer.id,
        },
      });
      return updated;
    });

    this.events.emit(
      'reminder.rule.published',
      {
        ruleId: published.id,
        key: published.key,
        version: published.version,
        triggerType: published.triggerType,
      },
      { actorId: viewer.id },
    );
    return toPublic(published);
  }

  async archive(viewer: AuthenticatedUser, id: string): Promise<ReminderRulePublic> {
    this.require('reminders:archive_rule', viewer);
    const existing = await prisma.reminderRule.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Reminder rule not found');
    if (existing.status !== 'active') {
      throw new BadRequestException('Only active rules can be archived');
    }
    const archived = await prisma.reminderRule.update({
      where: { id },
      data: { status: 'archived', effectiveTo: new Date() },
    });
    this.events.emit(
      'reminder.rule.archived',
      { ruleId: archived.id, key: archived.key },
      { actorId: viewer.id },
    );
    return toPublic(archived);
  }

  /**
   * Manual fire — used by the "Test rule" affordance on the rule
   * editor. Sends the notification to the caller only, regardless of
   * the rule's recipientResolver, so a test never spams real people.
   */
  async triggerTest(viewer: AuthenticatedUser, id: string): Promise<{ notificationId: string }> {
    this.require('reminders:trigger_test', viewer);
    const rule = await prisma.reminderRule.findUnique({ where: { id } });
    if (!rule || rule.deletedAt) throw new NotFoundException('Reminder rule not found');

    const { id: notificationId } = await this.notifications.send({
      recipientUserId: viewer.id,
      typeKey: rule.notificationType,
      payload: { _test: true, ruleKey: rule.key, ruleName: rule.name },
      actorId: viewer.id,
    });
    this.events.emit(
      'reminder.rule.tested',
      { ruleId: rule.id, key: rule.key, recipientUserId: viewer.id },
      { actorId: viewer.id },
    );
    return { notificationId };
  }
}

function toPublic(row: Prisma.ReminderRuleGetPayload<Record<string, never>>): ReminderRulePublic {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerType: row.triggerType,
    triggerSpec: row.triggerSpec as unknown as TriggerSpec,
    notificationType: row.notificationType,
    recipientResolver: row.recipientResolver,
    version: row.version,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedById: row.publishedById,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
  };
}
