import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  departmentCreateSchema,
  departmentListQuerySchema,
  departmentUpdateSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { DepartmentsService } from './departments.service';

@Controller('settings/departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermission('settings:departments:view')
  async list(@Query() rawQuery: Record<string, unknown>) {
    const query = departmentListQuerySchema.parse(rawQuery);
    return this.departments.list(query);
  }

  @Post()
  @RequirePermission('settings:departments:manage')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = departmentCreateSchema.parse(body);
    return this.departments.create(user, input);
  }

  @Patch(':id')
  @RequirePermission('settings:departments:manage')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = departmentUpdateSchema.parse(body);
    return this.departments.update(user, id, input);
  }

  @Delete(':id')
  @RequirePermission('settings:departments:manage')
  async hide(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.hide(user, id);
  }

  @Post(':id/restore')
  @RequirePermission('settings:departments:manage')
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.restore(user, id);
  }
}
