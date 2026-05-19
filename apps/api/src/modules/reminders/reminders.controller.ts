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
import { ReminderRulesService } from './reminder-rules.service';
import { RemindersReadService } from './reminders-read.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { RecipientResolverRegistry } from './recipient-resolver';
import { ConditionPreviewService } from './condition-preview.service';
import { triggerSpecSchema } from './reminder-trigger.types';
import { conditionNodeSchema } from './reminder-conditions.types';
import { buildFieldCatalogResponse } from './reminder-field-catalog';
import { buildEventCatalogResponse } from './event-type-catalog';

const listQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  key: z.string().optional(),
});

const recipientEntrySchema = z.object({
  kind: z.string().trim().min(1).max(80),
  config: z.record(z.string(), z.unknown()).optional(),
});

const createSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits, dashes'),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  triggerType: z.enum(['event', 'cron']),
  triggerSpec: triggerSpecSchema,
  notificationType: z.string().trim().min(1).max(120),
  /** LEGACY. FE keeps sending the first entry's kind so older rows
   *  retain a non-null fallback. */
  recipientResolver: z.string().trim().min(1).max(80),
  /** New multi-source array — preferred by the FE. */
  recipientResolvers: z.array(recipientEntrySchema).min(1).max(20).optional(),
  departmentId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  triggerSpec: triggerSpecSchema.optional(),
  notificationType: z.string().trim().min(1).max(120).optional(),
  recipientResolver: z.string().trim().min(1).max(80).optional(),
  recipientResolvers: z.array(recipientEntrySchema).min(1).max(20).nullable().optional(),
  departmentId: z.string().nullable().optional(),
  isEnabled: z.boolean().optional(),
});

const scheduledQuerySchema = z.object({
  status: z.enum(['scheduled', 'fired', 'cancelled', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const cancelScheduledSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

const previewConditionsSchema = z.object({
  sourceKind: z.string().trim().min(1).max(80),
  conditions: conditionNodeSchema.optional(),
  departmentId: z.string().nullable().optional(),
});

const previewRecipientsSchema = z.object({
  recipientResolvers: z.array(recipientEntrySchema).min(1).max(20),
  sourceKind: z.string().trim().min(1).max(80).nullable().optional(),
  sourceId: z.string().trim().min(1).max(80).nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

/**
 * Single controller with no prefix — routes are grouped under
 * /reminder-rules (rule CRUD + publish + archive + test) and
 * /reminders (scheduled list, status, timeline, cancel).
 */
@Controller()
export class RemindersController {
  constructor(
    private readonly rules: ReminderRulesService,
    private readonly read: RemindersReadService,
    private readonly scheduler: ReminderSchedulerService,
    private readonly resolvers: RecipientResolverRegistry,
    private readonly preview: ConditionPreviewService,
  ) {}

  /* ---------- Rule lifecycle ---------- */

  @Get('reminder-rules')
  @RequirePermission('reminders:view_rules')
  async listRules(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = listQuerySchema.parse(rawQuery);
    return this.rules.list(user, query);
  }

  @Get('reminder-rules/recipient-resolvers')
  @RequirePermission('reminders:view_rules')
  async listResolvers() {
    return {
      items: this.resolvers.list().map((r) => ({
        key: r.key,
        label: r.label,
        description: r.description ?? null,
        configSchema: r.configSchema ?? null,
      })),
    };
  }

  @Get('reminder-rules/trigger-counts')
  @RequirePermission('reminders:view_rules')
  async triggerCounts(@CurrentUser() user: AuthenticatedUser) {
    return this.read.triggerCountsNext30Days(user);
  }

  @Get('reminder-rules/field-catalog')
  @RequirePermission('reminders:view_rules')
  async fieldCatalog() {
    return buildFieldCatalogResponse();
  }

  @Get('reminder-rules/event-catalog')
  @RequirePermission('reminders:view_rules')
  async eventCatalog() {
    return buildEventCatalogResponse();
  }

  /**
   * Roles list used by the recipient-resolver picker (specifically
   * the `role-members` kind). Scoped to the reminders module instead
   * of a broader admin endpoint to keep the public surface focused.
   */
  @Get('reminder-rules/roles')
  @RequirePermission('reminders:view_rules')
  async listRoles() {
    return this.rules.listRoles();
  }

  /* ---------- Live preview (rule editor) ---------- */

  @Post('reminder-rules/preview-conditions')
  @RequirePermission('reminders:view_rules')
  @HttpCode(HttpStatus.OK)
  async previewConditions(@Body() body: unknown) {
    const input = previewConditionsSchema.parse(body);
    return this.preview.previewConditions(input);
  }

  @Post('reminder-rules/preview-recipients')
  @RequirePermission('reminders:view_rules')
  @HttpCode(HttpStatus.OK)
  async previewRecipients(@Body() body: unknown) {
    const input = previewRecipientsSchema.parse(body);
    return this.preview.previewRecipients(input);
  }

  @Get('reminder-rules/:id')
  @RequirePermission('reminders:view_rules')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.findOne(user, id);
  }

  @Post('reminder-rules')
  @RequirePermission('reminders:create_rule')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = createSchema.parse(body);
    return this.rules.create(user, input);
  }

  @Patch('reminder-rules/:id')
  @RequirePermission('reminders:update_rule')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateSchema.parse(body);
    return this.rules.update(user, id, input);
  }

  @Post('reminder-rules/:id/publish')
  @RequirePermission('reminders:publish_rule')
  @HttpCode(HttpStatus.OK)
  async publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.publish(user, id);
  }

  @Post('reminder-rules/:id/archive')
  @RequirePermission('reminders:archive_rule')
  @HttpCode(HttpStatus.OK)
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.archive(user, id);
  }

  @Post('reminder-rules/:id/trigger-test')
  @RequirePermission('reminders:trigger_test')
  @HttpCode(HttpStatus.OK)
  async triggerTest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.triggerTest(user, id);
  }

  /* ---------- Scheduled reminders + scheduler status ---------- */

  @Get('reminders/status')
  @RequirePermission('reminders:view_rules')
  async schedulerStatus() {
    return this.scheduler.getStatus();
  }

  @Get('reminders/timeline')
  @RequirePermission('reminders:view_rules')
  async timeline(@CurrentUser() user: AuthenticatedUser) {
    return this.read.timelineNext30Days(user);
  }

  @Get('reminders')
  @RequirePermission('reminders:view_scheduled')
  async listScheduled(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = scheduledQuerySchema.parse(rawQuery);
    return this.read.listScheduled(user, query);
  }

  @Post('reminders/:id/cancel')
  @RequirePermission('reminders:view_scheduled')
  @HttpCode(HttpStatus.OK)
  async cancelScheduled(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = cancelScheduledSchema.parse(body);
    return this.read.cancelScheduled(user, id, input.reason);
  }

  /**
   * Manual tick — admin/test affordance to advance the scheduler
   * without waiting for the cron. Gated on view_scheduled (HR Admin).
   */
  @Post('reminders/run-now')
  @RequirePermission('reminders:view_scheduled')
  @HttpCode(HttpStatus.OK)
  async runNow() {
    return this.scheduler.tickHandler();
  }
}
