/**
 * Custom notification types — HR-admin-managed runtime additions.
 *
 * Modules ship a static catalogue via NotificationTypesRegistry.
 * Phase 3.5 lets admins add new types from the UI without a deploy:
 * rows in CustomNotificationType are hydrated into the same registry
 * on boot, so the rest of the system (`notifications.send()`, the
 * reminder rule editor's picker, the notifications endpoint) treats
 * them identically to module-shipped types.
 *
 * This service owns the DB CRUD + telling the registry to reload
 * after each mutation. The registry is the runtime source of truth;
 * the table is the persistence layer.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { CustomNotificationType } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import {
  NotificationTypesRegistry,
  type Channel,
  type NotificationTypeDefinition,
  type Severity,
} from './notification-types.registry';

const ALLOWED_SEVERITIES: Severity[] = ['info', 'success', 'warning', 'danger'];
const ALLOWED_CHANNELS: Channel[] = ['in_app', 'email', 'push', 'slack'];

export interface CustomTypePublic {
  id: string;
  key: string;
  name: string;
  description: string | null;
  severity: Severity;
  channels: Channel[];
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate: string | null;
  isActive: boolean;
  /** Count of non-deleted reminder rules currently referencing
   *  this type's key. Drives the "Delete" button disabled state in
   *  the admin sheet — a referenced type cannot be hard-deleted. */
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomTypeInput {
  key: string;
  name: string;
  description?: string | null;
  severity: Severity;
  channels: Channel[];
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate?: string | null;
}

export interface UpdateCustomTypeInput {
  name?: string;
  description?: string | null;
  severity?: Severity;
  channels?: Channel[];
  titleTemplate?: string;
  bodyTemplate?: string;
  linkTemplate?: string | null;
  isActive?: boolean;
}

@Injectable()
export class CustomNotificationTypesService {
  private readonly logger = new Logger(CustomNotificationTypesService.name);

  constructor(
    private readonly registry: NotificationTypesRegistry,
    private readonly audit: AuditService,
  ) {}

  async listAll(): Promise<CustomTypePublic[]> {
    const rows = await prisma.customNotificationType.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    if (rows.length === 0) return [];
    // One groupBy gets every rule's notificationType usage in a
    // single round trip; map back onto rows by key.
    const usage = await prisma.reminderRule.groupBy({
      by: ['notificationType'],
      where: {
        deletedAt: null,
        notificationType: { in: rows.map((r) => r.key) },
      },
      _count: { _all: true },
    });
    const usageByKey = new Map<string, number>(
      usage.map((u) => [u.notificationType, u._count._all]),
    );
    return rows.map((row) => toPublic(row, usageByKey.get(row.key) ?? 0));
  }

  /**
   * Keys of every archived custom type. Used by the merged
   * `/notifications/types` listing to hide archived rows from the
   * rule editor's picker. The in-memory registry still has them
   * so already-pending reminders can fire — this is just a view
   * filter.
   */
  async listArchivedKeys(): Promise<Set<string>> {
    const rows = await prisma.customNotificationType.findMany({
      where: { isActive: false },
      select: { key: true },
    });
    return new Set(rows.map((r) => r.key));
  }

  async create(viewer: AuthenticatedUser, input: CreateCustomTypeInput): Promise<CustomTypePublic> {
    validate(input);
    if (!/^custom\.[a-z0-9][a-z0-9-]*$/.test(input.key)) {
      throw new BadRequestException(
        "key must start with 'custom.' and use lowercase letters, digits, and dashes (e.g. 'custom.weekly-pulse')",
      );
    }
    if (this.registry.get(input.key)) {
      throw new BadRequestException(
        `'${input.key}' is already registered. Pick a different key or update the existing type.`,
      );
    }
    const row = await prisma.customNotificationType.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        severity: input.severity,
        channels: input.channels,
        titleTemplate: input.titleTemplate,
        bodyTemplate: input.bodyTemplate,
        linkTemplate: input.linkTemplate ?? null,
        createdById: viewer.id,
      },
    });
    await this.audit.record({
      module: 'notifications',
      entity: 'CustomNotificationType',
      entityId: row.id,
      action: 'created',
      after: { key: row.key, name: row.name },
      actorId: viewer.id,
    });
    this.registerOne(row);
    return toPublic(row);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: UpdateCustomTypeInput,
  ): Promise<CustomTypePublic> {
    const existing = await prisma.customNotificationType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom notification type not found');
    validatePartial(input);
    const updated = await prisma.customNotificationType.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        severity: input.severity ?? undefined,
        channels: input.channels ?? undefined,
        titleTemplate: input.titleTemplate ?? undefined,
        bodyTemplate: input.bodyTemplate ?? undefined,
        linkTemplate: input.linkTemplate ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });
    await this.audit.record({
      module: 'notifications',
      entity: 'CustomNotificationType',
      entityId: updated.id,
      action: 'updated',
      before: { isActive: existing.isActive },
      after: { isActive: updated.isActive },
      actorId: viewer.id,
    });
    this.registerOne(updated);
    return toPublic(updated);
  }

  /**
   * Archives (sets isActive=false) instead of deleting — rules
   * referencing the key keep working until next save, and the audit
   * trail stays intact. To true-delete, archive first, then run a
   * one-shot script.
   */
  async archive(viewer: AuthenticatedUser, id: string): Promise<CustomTypePublic> {
    const existing = await prisma.customNotificationType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom notification type not found');
    if (!existing.isActive) return toPublic(existing);
    const updated = await prisma.customNotificationType.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record({
      module: 'notifications',
      entity: 'CustomNotificationType',
      entityId: updated.id,
      action: 'archived',
      actorId: viewer.id,
    });
    // Keep the in-registry definition so already-pending reminders
    // can still fire and emit a sensible notification — archiving is
    // about preventing NEW rules from picking the type. The picker
    // hides archived rows via the keys returned by `listArchivedKeys`.
    return toPublic(updated);
  }

  /**
   * Hard delete — drops the DB row + unregisters from the runtime
   * registry. Refuses when any non-deleted ReminderRule still
   * references the key, since the rule would start failing at fire
   * time (the registry's `require()` throws on unknown keys).
   */
  async delete(viewer: AuthenticatedUser, id: string): Promise<{ id: string }> {
    const existing = await prisma.customNotificationType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom notification type not found');
    const referencing = await prisma.reminderRule.count({
      where: { notificationType: existing.key, deletedAt: null },
    });
    if (referencing > 0) {
      throw new BadRequestException(
        `Can't delete '${existing.key}' — ${referencing} reminder rule${referencing === 1 ? '' : 's'} still reference it. Update or archive those rules first.`,
      );
    }
    await prisma.customNotificationType.delete({ where: { id } });
    this.registry.unregister(existing.key);
    await this.audit.record({
      module: 'notifications',
      entity: 'CustomNotificationType',
      entityId: existing.id,
      action: 'deleted',
      before: { key: existing.key, name: existing.name },
      actorId: viewer.id,
    });
    return { id: existing.id };
  }

  /**
   * Called on module init. Reads every active custom row and
   * registers it on the in-memory registry — the rest of the system
   * doesn't need to know whether a definition came from code or DB.
   */
  async hydrateRegistryOnBoot(): Promise<void> {
    const rows = await prisma.customNotificationType.findMany({ where: { isActive: true } });
    for (const row of rows) this.registerOne(row);
    this.logger.log(`hydrated ${rows.length} custom notification type(s) into the registry`);
  }

  private registerOne(row: CustomNotificationType): void {
    const def: NotificationTypeDefinition = {
      key: row.key,
      name: row.name,
      description: row.description ?? undefined,
      severity: row.severity as Severity,
      defaultChannels: row.channels as Channel[],
      titleTemplate: row.titleTemplate,
      bodyTemplate: row.bodyTemplate,
      linkTemplate: row.linkTemplate ?? undefined,
      module: 'custom',
    };
    this.registry.register(def);
  }
}

function validate(input: CreateCustomTypeInput): void {
  if (!ALLOWED_SEVERITIES.includes(input.severity)) {
    throw new BadRequestException(`severity must be one of ${ALLOWED_SEVERITIES.join(', ')}`);
  }
  if (input.channels.length === 0) {
    throw new BadRequestException('at least one channel is required');
  }
  for (const c of input.channels) {
    if (!ALLOWED_CHANNELS.includes(c)) {
      throw new BadRequestException(`channel '${c}' is not recognized`);
    }
  }
  if (!input.titleTemplate.trim()) throw new BadRequestException('titleTemplate is required');
  if (!input.bodyTemplate.trim()) throw new BadRequestException('bodyTemplate is required');
}

function validatePartial(input: UpdateCustomTypeInput): void {
  if (input.severity && !ALLOWED_SEVERITIES.includes(input.severity)) {
    throw new BadRequestException(`severity must be one of ${ALLOWED_SEVERITIES.join(', ')}`);
  }
  if (input.channels) {
    if (input.channels.length === 0) {
      throw new BadRequestException('at least one channel is required');
    }
    for (const c of input.channels) {
      if (!ALLOWED_CHANNELS.includes(c)) {
        throw new BadRequestException(`channel '${c}' is not recognized`);
      }
    }
  }
}

function toPublic(row: CustomNotificationType, usageCount = 0): CustomTypePublic {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    severity: row.severity as Severity,
    channels: row.channels as Channel[],
    titleTemplate: row.titleTemplate,
    bodyTemplate: row.bodyTemplate,
    linkTemplate: row.linkTemplate,
    isActive: row.isActive,
    usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
