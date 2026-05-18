import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { NotificationTypeDefinition } from '../notification-types.registry';

export interface InAppSendInput {
  recipientUserId: string;
  type: NotificationTypeDefinition;
  title: string;
  body: string;
  link: string | null;
  severity: string;
  channel: string;
  payload: Record<string, unknown> | null;
  sourceType: string | null;
  sourceId: string | null;
}

/**
 * In-app channel — just persists the Notification row.
 *
 * The bell icon + popover read from the same table. `status` starts at
 * `unread`; the read/dismiss actions transition it. For email-only
 * notifications (channel === 'email') the row still lands here with
 * `status='sent'` so the audit + bell-history surface stays complete.
 */
@Injectable()
export class InAppChannel {
  private readonly logger = new Logger(InAppChannel.name);

  async send(input: InAppSendInput): Promise<{ id: string }> {
    const initialStatus = input.channel === 'email' ? 'sent' : 'unread';
    const sentAt = new Date();
    const row = await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type.key,
        title: input.title,
        body: input.body,
        link: input.link,
        payload: (input.payload ?? null) as never,
        severity: input.severity,
        channel: input.channel,
        status: initialStatus,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sentAt,
      },
      select: { id: true },
    });
    return row;
  }
}
