import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
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
 * Email channel — renders a minimal HTML body and hands off to the
 * shared EmailService.
 *
 * Phase 3 ships a plain HTML render path so we can verify the
 * end-to-end pipeline against Mailpit (and Resend in prod) without
 * blocking on the React Email runtime install. The `@futurenostics/email`
 * package is the stable extension point: when modules want richer
 * templates they register them there and we swap the renderer here. The
 * notification's title/body/link are sufficient for every Phase 3
 * notification type — the template polish is a follow-up brief.
 *
 * The email channel does NOT create a separate Notification row; the
 * in-app channel already did. We only:
 *   1. Resolve the recipient's email address.
 *   2. Render the body.
 *   3. Call EmailService.send.
 *   4. Stamp the originating notification row with `emailMessageId`
 *      (best-effort — the transport doesn't always return one).
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
    const html = renderHtml({
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
        text: textFallback({ title: input.title, body: input.body, link: input.link }),
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

function renderHtml(input: {
  recipientName: string;
  title: string;
  body: string;
  link: string | null;
}): string {
  const safeBody = escapeHtml(input.body).replace(/\n/g, '<br />');
  const cta = input.link
    ? `<p style="margin:24px 0 0;"><a href="${escapeAttr(input.link)}" style="display:inline-block;padding:10px 18px;background:#5b53f5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Open in Futurenostics</a></p>`
    : '';
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f8;padding:32px;color:#1a1a23;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5ee;border-radius:12px;padding:32px;">
    <p style="margin:0 0 8px;color:#6b6b78;font-size:13px;">Hi ${escapeHtml(input.recipientName)},</p>
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#1a1a23;letter-spacing:-0.01em;">${escapeHtml(input.title)}</h1>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3d3d4a;">${safeBody}</p>
    ${cta}
    <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e5e5ee;" />
    <p style="margin:0;color:#9a9aab;font-size:11px;">Futurenostics HRMS · automated notification</p>
  </div>
</body></html>`;
}

function textFallback(input: { title: string; body: string; link: string | null }): string {
  return `${input.title}\n\n${input.body}${input.link ? `\n\nOpen: ${input.link}` : ''}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
