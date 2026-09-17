import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { AppConfigService } from '../../../config/app.config';
import { SlackService } from '../../../core/slack/slack.service';
import type { NotificationTypeDefinition } from '../notification-types.registry';

export interface SlackSendInput {
  recipientUserId: string;
  type: NotificationTypeDefinition;
  title: string;
  body: string;
  link: string | null;
}

/** How long to skip re-querying Slack after a lookup finds no matching account. */
const FAILED_LOOKUP_RETRY_MS = 24 * 60 * 60 * 1000;

/**
 * Slack channel — sends either a direct message to the recipient or a
 * post to the shared announcements channel, based on
 * `type.slackDelivery` ('dm' by default, 'channel' only for types that
 * opt into it — see notification-types.registry.ts).
 *
 * Does NOT create a Notification row — the in-app channel already did.
 */
@Injectable()
export class SlackChannel {
  private readonly logger = new Logger(SlackChannel.name);
  /** userId -> when the last failed lookup happened. Avoids hitting the
   *  Slack API again for staff without a Slack account on every send. */
  private readonly failedLookupAt = new Map<string, number>();

  constructor(
    private readonly slack: SlackService,
    private readonly config: AppConfigService,
  ) {}

  async send(input: SlackSendInput): Promise<{ ok: boolean }> {
    if (!this.slack.isConfigured) return { ok: false };

    const text = formatMessage({
      ...input,
      link: toAbsoluteUrl(input.link, this.config.env.APP_URL),
    });

    if (input.type.slackDelivery === 'channel') {
      if (!this.slack.announcementsChannelId) {
        this.logger.warn(
          `Skipping Slack channel post for ${input.type.key} — SLACK_ANNOUNCEMENTS_CHANNEL_ID not set.`,
        );
        return { ok: false };
      }
      return this.slack.postMessage(this.slack.announcementsChannelId, text);
    }

    const slackUserId = await this.resolveSlackUserId(input.recipientUserId);
    if (!slackUserId) {
      this.logger.warn(
        `Skipping Slack DM for ${input.recipientUserId} — no matching Slack account.`,
      );
      return { ok: false };
    }
    return this.slack.postMessage(slackUserId, text);
  }

  /** Cached on User.slackUserId after the first successful lookup. */
  private async resolveSlackUserId(userId: string): Promise<string | null> {
    const lastFailure = this.failedLookupAt.get(userId);
    if (lastFailure !== undefined && Date.now() - lastFailure < FAILED_LOOKUP_RETRY_MS) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, slackUserId: true },
    });
    if (!user) return null;
    if (user.slackUserId) return user.slackUserId;

    const found = await this.slack.lookupUserIdByEmail(user.email);
    if (found) {
      this.failedLookupAt.delete(userId);
      await prisma.user.update({ where: { id: userId }, data: { slackUserId: found } });
    } else {
      this.failedLookupAt.set(userId, Date.now());
    }
    return found;
  }
}

function formatMessage(input: { title: string; body: string; link: string | null }): string {
  const lines = [`*${input.title}*`, input.body];
  if (input.link) lines.push(`<${input.link}|Open in Futurenostics>`);
  return lines.join('\n\n');
}

/**
 * Notification link templates produce app-relative paths (`/dashboard`),
 * not full URLs. Slack's `<url|text>` link syntax only renders as a
 * clickable link when the url is absolute — a relative one prints as
 * literal text instead. Same fix applied in email.channel.ts.
 */
function toAbsoluteUrl(link: string | null, appUrl: string): string | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link)) return link;
  return `${appUrl.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`;
}
