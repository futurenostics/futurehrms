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
import { triggerSpecSchema } from './reminder-trigger.types';

const listQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  key: z.string().optional(),
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
  recipientResolver: z.string().trim().min(1).max(80),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  triggerSpec: triggerSpecSchema.optional(),
  notificationType: z.string().trim().min(1).max(120).optional(),
  recipientResolver: z.string().trim().min(1).max(80).optional(),
});

@Controller('reminder-rules')
export class RemindersController {
  constructor(private readonly rules: ReminderRulesService) {}

  @Get()
  @RequirePermission('reminders:view_rules')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = listQuerySchema.parse(rawQuery);
    return this.rules.list(user, query);
  }

  @Get(':id')
  @RequirePermission('reminders:view_rules')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.findOne(user, id);
  }

  @Post()
  @RequirePermission('reminders:create_rule')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = createSchema.parse(body);
    return this.rules.create(user, input);
  }

  @Patch(':id')
  @RequirePermission('reminders:update_rule')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateSchema.parse(body);
    return this.rules.update(user, id, input);
  }

  @Post(':id/publish')
  @RequirePermission('reminders:publish_rule')
  @HttpCode(HttpStatus.OK)
  async publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.publish(user, id);
  }

  @Post(':id/archive')
  @RequirePermission('reminders:archive_rule')
  @HttpCode(HttpStatus.OK)
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.archive(user, id);
  }

  @Post(':id/trigger-test')
  @RequirePermission('reminders:trigger_test')
  @HttpCode(HttpStatus.OK)
  async triggerTest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.triggerTest(user, id);
  }
}
