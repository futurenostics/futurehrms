import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { NotificationsService } from './notifications.service';
import { NotificationTypesRegistry } from './notification-types.registry';
import { NotificationPreferencesService } from './notification-preferences.service';

const listQuerySchema = z.object({
  status: z.enum(['unread', 'read', 'dismissed', 'sent', 'active']).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const upsertPreferenceSchema = z.object({
  type: z.string().min(1),
  channel: z.enum(['in_app', 'email', 'push', 'slack']),
  enabled: z.boolean(),
});

const sendArbitrarySchema = z.object({
  recipientUserId: z.string().min(1),
  typeKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  overrides: z
    .object({
      title: z.string().optional(),
      body: z.string().optional(),
      link: z.string().nullable().optional(),
      severity: z.enum(['info', 'success', 'warning', 'danger']).optional(),
    })
    .optional(),
});

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly types: NotificationTypesRegistry,
    private readonly prefs: NotificationPreferencesService,
  ) {}

  @Get()
  @RequirePermission('notifications:view_own')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = listQuerySchema.parse(rawQuery);
    return this.notifications.list(user, query);
  }

  @Get('unread-count')
  @RequirePermission('notifications:view_own')
  async unread(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(user);
  }

  @Get('types')
  @RequirePermission('notifications:view_own')
  async listTypes() {
    return {
      items: this.types.list().map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description ?? null,
        severity: t.severity,
        module: t.module,
        defaultChannels: t.defaultChannels,
      })),
    };
  }

  @Get('preferences')
  @RequirePermission('notifications:view_own')
  async preferences(@CurrentUser() user: AuthenticatedUser) {
    const items = await this.prefs.listForUser(user.id);
    return {
      items: items.map((p) => ({
        type: p.type,
        channel: p.channel,
        enabled: p.enabled,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  @Patch('preferences')
  @RequirePermission('notifications:view_own')
  async upsertPreference(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = upsertPreferenceSchema.parse(body);
    await this.prefs.upsert({ userId: user.id, ...input });
    return { ok: true };
  }

  @Patch(':id/read')
  @RequirePermission('notifications:view_own')
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post('mark-all-read')
  @RequirePermission('notifications:view_own')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user);
  }

  @Patch(':id/dismiss')
  @RequirePermission('notifications:view_own')
  async dismiss(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.dismiss(user, id);
  }

  /**
   * Super-admin escape hatch. Lets a runbook or test send an arbitrary
   * notification to a user without an event triggering it. Gated on
   * the `send_arbitrary` permission (only super_admin by default).
   */
  @Post('send')
  @RequirePermission('notifications:send_arbitrary')
  async sendArbitrary(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = sendArbitrarySchema.parse(body);
    return this.notifications.send({ ...input, actorId: user.id });
  }
}
