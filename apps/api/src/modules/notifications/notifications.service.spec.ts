/**
 * NotificationsService integration tests.
 *
 * Exercises the notifications plumbing end-to-end against a real Prisma
 * connection (matching the approvals.service.spec convention). Throwaway
 * NotificationTypeDefinitions are registered with the registry so we can
 * drive send / list / mutations without depending on any real module's
 * registered types.
 *
 * EmailChannel is stubbed — the in-app path is what needs correctness
 * coverage here; email is a dumb hand-off already covered by its own
 * render-path logic. Stubbing also keeps this suite from depending on
 * Mailpit being up, unlike every other integration spec in this repo.
 *
 * Each test creates its own pair of users + a run-scoped type key, then
 * cleans up via `type.startsWith('test-notif-')` — every row created
 * here uses that prefix, so deletion is scoped and cannot leak to real
 * data.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { RequestContextService } from '../../core/request-context/request-context.service';
import { NotificationsService } from './notifications.service';
import {
  NotificationTypesRegistry,
  type NotificationTypeDefinition,
} from './notification-types.registry';
import { NotificationPreferencesService } from './notification-preferences.service';
import { InAppChannel } from './channels/in-app.channel';
import type { EmailChannel } from './channels/email.channel';

const TEST_RUN_ID = randomUUID().slice(0, 8);
const TYPE_WITH_EMAIL = `test-notif-email-${TEST_RUN_ID}`;
const TYPE_IN_APP_ONLY = `test-notif-inapp-${TEST_RUN_ID}`;

function makeType(overrides: Partial<NotificationTypeDefinition>): NotificationTypeDefinition {
  const base: NotificationTypeDefinition = {
    key: TYPE_IN_APP_ONLY,
    name: 'Test type',
    severity: 'info',
    defaultChannels: ['in_app'],
    titleTemplate: 'Title {{name}}',
    bodyTemplate: 'Body {{name}} {{amount}}',
    linkTemplate: '/things/{{id}}',
    module: 'test',
  };
  return { ...base, ...overrides };
}

let service: NotificationsService;
let registry: NotificationTypesRegistry;
let prefs: NotificationPreferencesService;
let emailStub: { send: ReturnType<typeof vi.fn> };

let recipient: AuthenticatedUser;
let otherUser: AuthenticatedUser;

beforeAll(async () => {
  const requestContext = new RequestContextService();
  const audit = new AuditService(requestContext);
  const events = new EventBusService(new EventEmitter2());
  registry = new NotificationTypesRegistry();
  prefs = new NotificationPreferencesService();
  const inApp = new InAppChannel();
  emailStub = { send: vi.fn().mockResolvedValue({ messageId: null }) };

  service = new NotificationsService(
    registry,
    prefs,
    inApp,
    emailStub as unknown as EmailChannel,
    events,
    audit,
  );

  registry.registerMany([
    makeType({ key: TYPE_WITH_EMAIL, defaultChannels: ['in_app', 'email'] }),
    makeType({ key: TYPE_IN_APP_ONLY, defaultChannels: ['in_app'] }),
  ]);

  const recipientRow = await prisma.user.create({
    data: { email: `notif-recipient-${TEST_RUN_ID}@test.local`, passwordHash: 'x', isActive: true },
  });
  const otherRow = await prisma.user.create({
    data: { email: `notif-other-${TEST_RUN_ID}@test.local`, passwordHash: 'x', isActive: true },
  });

  recipient = {
    id: recipientRow.id,
    email: recipientRow.email,
    employeeId: null,
    permissions: ['notifications:view_own'],
    roles: [],
    scopedDepartmentIds: [],
  };
  otherUser = {
    id: otherRow.id,
    email: otherRow.email,
    employeeId: null,
    permissions: ['notifications:view_own'],
    roles: [],
    scopedDepartmentIds: [],
  };
});

beforeEach(async () => {
  emailStub.send.mockClear();
  await prisma.notification.deleteMany({ where: { type: { startsWith: 'test-notif-' } } });
  await prisma.notificationPreference.deleteMany({
    where: { type: { startsWith: 'test-notif-' } },
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { type: { startsWith: 'test-notif-' } } });
  await prisma.notificationPreference.deleteMany({
    where: { type: { startsWith: 'test-notif-' } },
  });
  await prisma.auditLog.deleteMany({ where: { module: 'notifications', entity: 'Notification' } });
  await prisma.user.deleteMany({ where: { email: { in: [recipient.email, otherUser.email] } } });
  await prisma.$disconnect();
});

/* ----------------------- send: title/body resolution ----------------------- */

describe('NotificationsService.send — title/body resolution', () => {
  it('interpolates payload into title/body when no override is given', async () => {
    const { id } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
      payload: { name: 'Ada', amount: 42 },
    });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe('Title Ada');
    expect(row.body).toBe('Body Ada 42');
  });

  it('renders missing template vars as empty string when no payload is given', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe('Title ');
    expect(row.body).toBe('Body  ');
  });

  it('overrides.body wins over template interpolation even when payload is present', async () => {
    const { id } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
      payload: { name: 'Ada', amount: 42 },
      overrides: { body: 'Custom body text' },
    });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe('Title Ada');
    expect(row.body).toBe('Custom body text');
  });

  it('overrides.title/link/severity independently override their own field only', async () => {
    const { id } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
      payload: { name: 'Ada', amount: 42, id: 'abc' },
      overrides: { title: 'Custom title', severity: 'danger' },
    });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe('Custom title');
    expect(row.body).toBe('Body Ada 42');
    expect(row.link).toBe('/things/abc');
    expect(row.severity).toBe('danger');
  });
});

/* ----------------------- send: channel resolution ----------------------- */

describe('NotificationsService.send — channel resolution', () => {
  it('sends in_app only when the type has no email default and no opt-in', async () => {
    const { channels } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
    });
    expect(channels).toEqual(['in_app']);
    expect(emailStub.send).not.toHaveBeenCalled();
  });

  it('includes email and calls EmailChannel when the type defaults to email', async () => {
    const { id, channels } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_WITH_EMAIL,
    });
    expect(channels).toEqual(expect.arrayContaining(['in_app', 'email']));
    expect(emailStub.send).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ recipientUserId: recipient.id }),
    );
  });

  it('excludes email when the user has explicitly disabled it for that type', async () => {
    await prefs.upsert({
      userId: recipient.id,
      type: TYPE_WITH_EMAIL,
      channel: 'email',
      enabled: false,
    });
    const { channels } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_WITH_EMAIL,
    });
    expect(channels).not.toContain('email');
    expect(emailStub.send).not.toHaveBeenCalled();
  });

  it('opts into a non-default channel when the user explicitly enables it', async () => {
    await prefs.upsert({
      userId: recipient.id,
      type: TYPE_IN_APP_ONLY,
      channel: 'email',
      enabled: true,
    });
    const { channels } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
    });
    expect(channels).toEqual(expect.arrayContaining(['in_app', 'email']));
  });

  it('the in-app row always starts as unread via this call path, even with email included', async () => {
    // InAppChannel.send flips initialStatus to 'sent' only when
    // channel === 'email' exactly — sendForType always computes
    // channelLabel as 'both' | 'in_app', never 'email' alone, so that
    // branch is unreachable through this call site today.
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_WITH_EMAIL });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('unread');
  });
});

/* ----------------------- list / unreadCount ----------------------- */

describe('NotificationsService.list / unreadCount', () => {
  it('throws ForbiddenException without notifications:view_own', async () => {
    const unprivileged: AuthenticatedUser = { ...recipient, permissions: [] };
    await expect(service.list(unprivileged, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.unreadCount(unprivileged)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns only the caller’s own notifications', async () => {
    await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.send({ recipientUserId: otherUser.id, typeKey: TYPE_IN_APP_ONLY });

    const { items, total } = await service.list(recipient, {});
    expect(total).toBe(1);
    expect(items.every((i) => i.type === TYPE_IN_APP_ONLY)).toBe(true);
  });

  it('filters by status', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.markRead(recipient, id);
    await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });

    const read = await service.list(recipient, { status: 'read' });
    expect(read.items).toHaveLength(1);
    expect(read.items[0]!.id).toBe(id);

    const unread = await service.list(recipient, { status: 'unread' });
    expect(unread.items).toHaveLength(1);
  });

  it('excludes snoozed notifications from the default list and unreadCount', async () => {
    const { id: visibleId } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
    });
    const { id: snoozedId } = await service.send({
      recipientUserId: recipient.id,
      typeKey: TYPE_IN_APP_ONLY,
    });
    await service.snooze(recipient, snoozedId, new Date(Date.now() + 60 * 60 * 1000));

    const { items, total } = await service.list(recipient, {});
    expect(total).toBe(1);
    expect(items[0]!.id).toBe(visibleId);

    const { count } = await service.unreadCount(recipient);
    expect(count).toBe(1);
  });

  it('paginates via limit/offset', async () => {
    for (let i = 0; i < 3; i++) {
      await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    }
    const page1 = await service.list(recipient, { limit: 2, offset: 0 });
    const page2 = await service.list(recipient, { limit: 2, offset: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    expect(page1.total).toBe(3);
  });
});

/* ----------------------- markRead ----------------------- */

describe('NotificationsService.markRead', () => {
  it('marks unread as read and stamps readAt', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const updated = await service.markRead(recipient, id);
    expect(updated.status).toBe('read');
    expect(updated.readAt).not.toBeNull();
  });

  it('is idempotent on an already-read notification', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const first = await service.markRead(recipient, id);
    const second = await service.markRead(recipient, id);
    expect(second.readAt).toBe(first.readAt);
  });

  it('throws BadRequestException when the notification is dismissed', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.dismiss(recipient, id);
    await expect(service.markRead(recipient, id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException when acting on someone else’s notification', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await expect(service.markRead(otherUser, id)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

/* ----------------------- dismiss ----------------------- */

describe('NotificationsService.dismiss', () => {
  it('marks as dismissed regardless of prior status', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const updated = await service.dismiss(recipient, id);
    expect(updated.status).toBe('dismissed');
  });

  it('throws ForbiddenException when acting on someone else’s notification', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await expect(service.dismiss(otherUser, id)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

/* ----------------------- acknowledge ----------------------- */

describe('NotificationsService.acknowledge', () => {
  it('sets acknowledgedAt and marks read', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const updated = await service.acknowledge(recipient, id);
    expect(updated.status).toBe('read');
    expect(updated.acknowledgedAt).not.toBeNull();
  });

  it('preserves the original readAt if already read', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const read = await service.markRead(recipient, id);
    const acked = await service.acknowledge(recipient, id);
    expect(acked.readAt).toBe(read.readAt);
  });

  it('throws BadRequestException on a dismissed notification', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.dismiss(recipient, id);
    await expect(service.acknowledge(recipient, id)).rejects.toBeInstanceOf(BadRequestException);
  });
});

/* ----------------------- snooze / unsnooze ----------------------- */

describe('NotificationsService.snooze / unsnooze', () => {
  it('sets snoozedUntil and resets status to unread', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.markRead(recipient, id);
    const until = new Date(Date.now() + 60 * 60 * 1000);
    const updated = await service.snooze(recipient, id, until);
    expect(updated.status).toBe('unread');
    expect(updated.snoozedUntil).toBe(until.toISOString());
  });

  it('throws BadRequestException for a non-future timestamp', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await expect(service.snooze(recipient, id, new Date(Date.now() - 1000))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException on a dismissed notification', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.dismiss(recipient, id);
    await expect(
      service.snooze(recipient, id, new Date(Date.now() + 60 * 60 * 1000)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unsnooze clears snoozedUntil', async () => {
    const { id } = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.snooze(recipient, id, new Date(Date.now() + 60 * 60 * 1000));
    const updated = await service.unsnooze(recipient, id);
    expect(updated.snoozedUntil).toBeNull();
  });
});

/* ----------------------- markAllRead ----------------------- */

describe('NotificationsService.markAllRead', () => {
  it('updates only unread rows and returns the accurate count', async () => {
    const a = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const b = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    const c = await service.send({ recipientUserId: recipient.id, typeKey: TYPE_IN_APP_ONLY });
    await service.dismiss(recipient, c.id);

    const { updated } = await service.markAllRead(recipient);
    expect(updated).toBe(2);

    const rowA = await prisma.notification.findUniqueOrThrow({ where: { id: a.id } });
    const rowB = await prisma.notification.findUniqueOrThrow({ where: { id: b.id } });
    const rowC = await prisma.notification.findUniqueOrThrow({ where: { id: c.id } });
    expect(rowA.status).toBe('read');
    expect(rowB.status).toBe('read');
    expect(rowC.status).toBe('dismissed');
  });
});
