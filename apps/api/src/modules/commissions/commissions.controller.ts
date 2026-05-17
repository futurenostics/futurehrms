import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  commissionRuleCreateSchema,
  commissionRuleListQuerySchema,
  commissionRulePublishSchema,
  commissionRuleUpdateSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { CommissionRulesService } from './commission-rules.service';

@Controller('commission-rules')
export class CommissionsController {
  constructor(private readonly rules: CommissionRulesService) {}

  @Get()
  @RequirePermission('commissions:view_rules')
  async list(@Query() rawQuery: Record<string, unknown>) {
    const query = commissionRuleListQuerySchema.parse(rawQuery);
    return this.rules.list(query);
  }

  @Get('active')
  @RequirePermission('commissions:view_rules')
  async listActive() {
    return this.rules.list(commissionRuleListQuerySchema.parse({ activeOnly: true, limit: 1000 }));
  }

  @Get(':id')
  @RequirePermission('commissions:view_rules')
  async findOne(@Param('id') id: string) {
    return this.rules.findOne(id);
  }

  @Get(':id/affected-projects')
  @RequirePermission('commissions:view_rules')
  async affectedProjects(@Param('id') id: string) {
    return this.rules.affectedProjects(id);
  }

  @Post()
  @RequirePermission('commissions:manage_rules')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = commissionRuleCreateSchema.parse(body);
    return this.rules.create(user, input);
  }

  @Patch(':id')
  @RequirePermission('commissions:manage_rules')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionRuleUpdateSchema.parse(body);
    return this.rules.update(user, id, input);
  }

  @Post(':id/publish')
  @RequirePermission('commissions:manage_rules')
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = commissionRulePublishSchema.parse(body);
    return this.rules.publish(user, id, input);
  }
}
