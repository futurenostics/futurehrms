import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Channel, NotificationTypeDefinition } from './notification-types.registry';

/**
 * Resolves which channels a notification should hit for a given user.
 *
 * Default policy:
 *   - In-app: always on, regardless of preference (it's the inbox; you
 *     don't get to opt out of the in-app record).
 *   - Email: on if the type's `defaultChannels` includes `email` AND the
 *     user hasn't explicitly disabled it for this type.
 *   - push / slack: stubbed for forward-compat — defaults look at prefs
 *     but no transport is wired.
 *
 * The user opts out by inserting a NotificationPreference row with
 * `enabled=false`. Opt-in only happens when the type's default list
 * doesn't include a channel (e.g., turning email on for a type that's
 * info-severity-only by default).
 */
@Injectable()
export class NotificationPreferencesService {
  /**
   * Returns the channels to fire for this (user, type) combination.
   * `in_app` is always included.
   */
  async resolveChannels(userId: string, type: NotificationTypeDefinition): Promise<Channel[]> {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId, type: type.key },
      select: { channel: true, enabled: true },
    });
    const prefByChannel = new Map(prefs.map((p) => [p.channel as Channel, p.enabled]));

    const out = new Set<Channel>(['in_app']);
    for (const ch of type.defaultChannels) {
      if (ch === 'in_app') continue;
      // explicit override wins; otherwise inherit default-on
      const explicit = prefByChannel.get(ch);
      if (explicit === false) continue;
      out.add(ch);
    }
    // user can also opt INTO a non-default channel
    for (const [ch, enabled] of prefByChannel) {
      if (enabled && ch !== 'in_app') out.add(ch);
    }
    return Array.from(out);
  }

  async listForUser(
    userId: string,
  ): Promise<Array<{ type: string; channel: string; enabled: boolean; updatedAt: Date }>> {
    return prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, channel: true, enabled: true, updatedAt: true },
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    });
  }

  async upsert(input: {
    userId: string;
    type: string;
    channel: Channel;
    enabled: boolean;
  }): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId: input.userId,
          type: input.type,
          channel: input.channel,
        },
      },
      update: { enabled: input.enabled },
      create: {
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        enabled: input.enabled,
      },
    });
  }
}
