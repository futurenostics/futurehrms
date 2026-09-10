import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { AppConfigService } from '../../config/app.config';

/**
 * Thin wrapper around the Slack Web API — transport only, same shape
 * as EmailService. No message formatting lives here.
 *
 * SLACK_BOT_TOKEN is optional. When it's blank, `client` stays null and
 * every method becomes a logged no-op instead of throwing — the rest of
 * the app should be able to run with Slack unconfigured (local dev,
 * environments that don't use Slack at all).
 */
@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly client: WebClient | null;
  readonly announcementsChannelId: string;

  constructor(private readonly config: AppConfigService) {
    const env = config.env;
    this.announcementsChannelId = env.SLACK_ANNOUNCEMENTS_CHANNEL_ID;
    this.client = env.SLACK_BOT_TOKEN ? new WebClient(env.SLACK_BOT_TOKEN) : null;
    if (!this.client) {
      this.logger.warn('SLACK_BOT_TOKEN not set — Slack delivery is disabled.');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /** Looks up a Slack member id by email. Returns null if not found or Slack isn't configured. */
  async lookupUserIdByEmail(email: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const res = await this.client.users.lookupByEmail({ email });
      return res.user?.id ?? null;
    } catch (err) {
      this.logger.warn(`Slack lookupByEmail failed for ${email}: ${(err as Error).message}`);
      return null;
    }
  }

  /** Posts a message to a channel id or a user id (Slack treats a DM as posting to the user's id). */
  async postMessage(channel: string, text: string): Promise<{ ok: boolean }> {
    if (!this.client) return { ok: false };
    try {
      await this.client.chat.postMessage({ channel, text, unfurl_links: false });
      return { ok: true };
    } catch (err) {
      this.logger.error(`Slack postMessage to ${channel} failed: ${(err as Error).message}`);
      return { ok: false };
    }
  }
}
