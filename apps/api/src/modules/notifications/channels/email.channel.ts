import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { renderNotificationEmail } from '@futurenostics/email';
import { EmailService } from '../../../core/email/email.service';
import type { NotificationTypeDefinition } from '../notification-types.registry';

export interface EmailSendInput {
  recipientUserId: string;
  type: NotificationTypeDefinition;
  title: string;
  body: string;
  link: string | null;
  payload: Record<string, unknown> | null;
}

/**
 * Email channel — renders the notification via `@futurenostics/email`
 * (React Email) and hands off to the shared EmailService.
 *
 * The email channel does NOT create a separate Notification row; the
 * in-app channel already did. We only:
 *   1. Resolve the recipient's email address.
 *   2. Render the body via renderNotificationEmail (HTML + text).
 *   3. Call EmailService.send.
 *   4. Stamp the originating notification row with `emailMessageId`
 *      (best-effort — the transport doesn't always return one).
 *
 * Every notification type shares the one NotificationEmail layout —
 * there's no per-type template yet (no design brief exists for that).
 */
@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly email: EmailService) {}

  async send(notificationId: string, input: EmailSendInput): Promise<{ messageId: string | null }> {
    const user = await prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: { email: true, employee: { select: { fullName: true } } },
    });
    if (!user?.email) {
      this.logger.warn(`Skipping email for ${input.recipientUserId} — no email on user record.`);
      return { messageId: null };
    }

    const recipientName = user.employee?.fullName ?? user.email;
    const { html, text } = await renderNotificationEmail({
      recipientName,
      title: input.title,
      body: input.body,
      link: input.link,
    });

    try {
      await this.email.send({
        to: user.email,
        subject: input.title,
        html,
        text,
      });
      // Mark the originating row with a best-effort flag — Resend
      // returns an id but nodemailer doesn't surface one through the
      // EmailService's current return type, so we just stamp a sent
      // marker rather than the provider id.
      await prisma.notification.update({
        where: { id: notificationId },
        data: { emailMessageId: 'sent' },
      });
      return { messageId: 'sent' };
    } catch (err) {
      this.logger.error(
        `Email send failed for notification ${notificationId} (${input.type.key}): ${(err as Error).message}`,
      );
      return { messageId: null };
    }
  }
}
