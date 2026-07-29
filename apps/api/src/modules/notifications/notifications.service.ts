/**
 * NotificationsService — the public surface other modules call to send.
 *
 * Lifecycle for a single send:
 *   1. Look up the registered NotificationType — fail loud if missing.
 *   2. Resolve channels via NotificationPreferencesService.
 *   3. Interpolate title/body/link templates against the payload.
 *   4. Always create the in-app Notification row (it's the inbox).
 *   5. If email is in the resolved channels, hand off to EmailChannel.
 *   6. Emit `notification.sent` for downstream subscribers.
 *
 * Bulk send is a thin loop — Phase 3 doesn't try to batch by template
 * or coalesce per recipient. Each recipient gets their own row + email.
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
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { EmailChannel } from './channels/email.channel';
import { InAppChannel } from './channels/in-app.channel';
import {
  NotificationTypesRegistry,
  type Channel,
  type NotificationTypeDefinition,
} from './notification-types.registry';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface SendNotificationInput {
  recipientUserId: string;
  typeKey: string;
  payload?: Record<string, unknown>;
  /** Polymorphic source — links the notification back to whatever produced it. */
  source?: { type: string; id: string };
  /**
   * Optional overrides — used by tests or by "send_arbitrary" admin
   * sends that don't go through a registered type's template. Title /
   * body / link / severity here win over the template's defaults.
   */
  overrides?: {
    title?: string;
    body?: string;
    link?: string | null;
    severity?: string;
  };
  actorId?: string;
}

export interface NotificationPublic {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: string;
  channel: string;
  status: string;
  payload: unknown;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  snoozedUntil: string | null;
}

export interface ListNotificationsQuery {
  status?: 'unread' | 'read' | 'dismissed' | 'sent' | 'active';
  type?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly types: NotificationTypesRegistry,
    private readonly prefs: NotificationPreferencesService,
    private readonly inApp: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly events: EventBusService,
    private readonly audit: AuditService,
  ) {}

  async send(input: SendNotificationInput): Promise<{ id: string; channels: Channel[] }> {
    const type = this.types.require(input.typeKey);
    return this.sendForType(type, input);
  }

  async sendBulk(
    typeKey: string,
    inputs: Array<Omit<SendNotificationInput, 'typeKey'>>,
  ): Promise<Array<{ id: string; channels: Channel[]; recipientUserId: string }>> {
    const type = this.types.require(typeKey);
    const out: Array<{ id: string; channels: Channel[]; recipientUserId: string }> = [];
    for (const i of inputs) {
      const { id, channels } = await this.sendForType(type, { ...i, typeKey });
      out.push({ id, channels, recipientUserId: i.recipientUserId });
    }
    return out;
  }

  private async sendForType(
    type: NotificationTypeDefinition,
    input: SendNotificationInput,
  ): Promise<{ id: string; channels: Channel[] }> {
    const payload = input.payload ?? null;
    const title =
      input.overrides?.title ?? NotificationTypesRegistry.interpolate(type.titleTemplate, payload);
    const body =
      input.overrides?.body ?? NotificationTypesRegistry.interpolate(type.bodyTemplate, payload);
    const link =
      input.overrides?.link ??
      (type.linkTemplate
        ? NotificationTypesRegistry.interpolate(type.linkTemplate, payload)
        : null);
    const severity = input.overrides?.severity ?? type.severity;

    const channels = await this.prefs.resolveChannels(input.recipientUserId, type);
    const channelLabel: 'in_app' | 'email' | 'both' = channels.includes('email')
      ? 'both'
      : 'in_app';

    const { id } = await this.inApp.send({
      recipientUserId: input.recipientUserId,
      type,
      title,
      body,
      link: link ?? null,
      severity,
      channel: channelLabel,
      payload,
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
    });

    if (channels.includes('email')) {
      // Fire and continue — email errors are logged inside the channel
      // and don't block the in-app record. The send remains audited.
      void this.emailChannel.send(id, {
        recipientUserId: input.recipientUserId,
        type,
        title,
        body,
        link: link ?? null,
        payload,
      });
    }

    this.events.emit(
      'notification.sent',
      {
        notificationId: id,
        recipientUserId: input.recipientUserId,
        typeKey: type.key,
        channels,
        sourceType: input.source?.type ?? null,
        sourceId: input.source?.id ?? null,
      },
      { actorId: input.actorId },
    );

    // Read-only / passive sends (system → user) get an audit trail so
    // we can answer "what was this user told, when".
    await this.audit.record({
      module: 'notifications',
      entity: 'Notification',
      entityId: id,
      action: 'sent',
      after: {
        recipientUserId: input.recipientUserId,
        type: type.key,
        channels,
        severity,
      },
      actorId: input.actorId,
    });

    return { id, channels };
  }

  /* ---------- Reads ---------- */

  async list(
    viewer: AuthenticatedUser,
    query: ListNotificationsQuery,
  ): Promise<{ items: NotificationPublic[]; total: number; unreadCount: number }> {
    if (!viewer.permissions.includes('notifications:view_own')) {
      throw new ForbiddenException('notifications:view_own required');
    }
    const now = new Date();
    const where: Prisma.NotificationWhereInput = { recipientUserId: viewer.id };
    if (query.status && query.status !== 'active') {
      where.status = query.status;
    } else if (query.status === 'active') {
      where.status = { in: ['unread', 'read'] };
    }
    if (query.type) where.type = query.type;
    // Hide currently-snoozed items from the active + unread surfaces;
    // they resurface once snoozedUntil passes.
    if (!query.status || query.status === 'active' || query.status === 'unread') {
      where.AND = [{ OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] }];
    }

    const [rows, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: Math.min(query.limit ?? 20, 100),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          recipientUserId: viewer.id,
          status: 'unread',
          OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        },
      }),
    ]);

    return {
      items: rows.map(toPublic),
      total,
      unreadCount,
    };
  }

  async unreadCount(viewer: AuthenticatedUser): Promise<{ count: number }> {
    if (!viewer.permissions.includes('notifications:view_own')) {
      throw new ForbiddenException('notifications:view_own required');
    }
    const now = new Date();
    const count = await prisma.notification.count({
      where: {
        recipientUserId: viewer.id,
        status: 'unread',
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
    });
    return { count };
  }

  /* ---------- Mutations ---------- */

  async markRead(viewer: AuthenticatedUser, id: string): Promise<NotificationPublic> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.recipientUserId !== viewer.id) {
      throw new ForbiddenException('Cannot mark someone else’s notification as read');
    }
    if (existing.status === 'dismissed') {
      throw new BadRequestException('Cannot un-dismiss a notification by marking it read');
    }
    if (existing.status === 'read') {
      return toPublic(existing);
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { status: 'read', readAt: new Date() },
    });
    this.events.emit(
      'notification.read',
      { notificationId: id, recipientUserId: viewer.id },
      { actorId: viewer.id },
    );
    return toPublic(updated);
  }

  async markAllRead(viewer: AuthenticatedUser): Promise<{ updated: number }> {
    const result = await prisma.notification.updateMany({
      where: { recipientUserId: viewer.id, status: 'unread' },
      data: { status: 'read', readAt: new Date() },
    });
    if (result.count > 0) {
      this.events.emit(
        'notification.read',
        { recipientUserId: viewer.id, batch: true, count: result.count },
        { actorId: viewer.id },
      );
    }
    return { updated: result.count };
  }

  async dismiss(viewer: AuthenticatedUser, id: string): Promise<NotificationPublic> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.recipientUserId !== viewer.id) {
      throw new ForbiddenException('Cannot dismiss someone else’s notification');
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { status: 'dismissed' },
    });
    this.events.emit(
      'notification.dismissed',
      { notificationId: id, recipientUserId: viewer.id },
      { actorId: viewer.id },
    );
    return toPublic(updated);
  }

  /**
   * Explicitly acknowledge ("I've handled this") — a stronger signal
   * than `read`. Also marks it read so it leaves the unread count, but
   * keeps it in the list (not dismissed).
   */
  async acknowledge(viewer: AuthenticatedUser, id: string): Promise<NotificationPublic> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.recipientUserId !== viewer.id) {
      throw new ForbiddenException('Cannot acknowledge someone else’s notification');
    }
    if (existing.status === 'dismissed') {
      throw new BadRequestException('Cannot acknowledge a dismissed notification');
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: 'read',
        readAt: existing.readAt ?? new Date(),
        acknowledgedAt: existing.acknowledgedAt ?? new Date(),
      },
    });
    this.events.emit(
      'notification.acknowledged',
      { notificationId: id, recipientUserId: viewer.id },
      { actorId: viewer.id },
    );
    return toPublic(updated);
  }

  /**
   * Snooze until `until` (must be in the future). While snoozed the
   * notification is hidden from the bell + unread count, then resurfaces
   * as unread once the time passes.
   */
  async snooze(viewer: AuthenticatedUser, id: string, until: Date): Promise<NotificationPublic> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.recipientUserId !== viewer.id) {
      throw new ForbiddenException('Cannot snooze someone else’s notification');
    }
    if (existing.status === 'dismissed') {
      throw new BadRequestException('Cannot snooze a dismissed notification');
    }
    if (until.getTime() <= Date.now()) {
      throw new BadRequestException('Snooze time must be in the future');
    }
    const updated = await prisma.notification.update({
      where: { id },
      // Resurface as unread so it draws attention when it comes back.
      data: { snoozedUntil: until, status: 'unread', readAt: null },
    });
    this.events.emit(
      'notification.snoozed',
      { notificationId: id, recipientUserId: viewer.id, until: until.toISOString() },
      { actorId: viewer.id },
    );
    return toPublic(updated);
  }

  /** Clear a snooze so the notification returns to the bell immediately. */
  async unsnooze(viewer: AuthenticatedUser, id: string): Promise<NotificationPublic> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.recipientUserId !== viewer.id) {
      throw new ForbiddenException('Cannot unsnooze someone else’s notification');
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { snoozedUntil: null },
    });
    return toPublic(updated);
  }
}

function toPublic(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: string;
  channel: string;
  status: string;
  payload: unknown;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: Date;
  readAt: Date | null;
  acknowledgedAt: Date | null;
  snoozedUntil: Date | null;
}): NotificationPublic {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    severity: row.severity,
    channel: row.channel,
    status: row.status,
    payload: row.payload,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
  };
}
