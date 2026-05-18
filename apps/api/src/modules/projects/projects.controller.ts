import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  projectAssignmentInputSchema,
  projectCategoryCreateSchema,
  projectCategoryUpdateSchema,
  projectChangeStatusSchema,
  projectCreateSchema,
  projectFilterCountsQuerySchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { ProjectsService } from './projects.service';

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /* ---------- Project reads ---------- */

  @Get('projects')
  @RequirePermission('projects:view_own')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = projectListQuerySchema.parse(rawQuery);
    return this.projects.list(user, query);
  }

  /**
   * Powers the Advanced Filters drawer on the projects list page —
   * returns the matched total plus per-option counts under the
   * current filter state. The frontend debounces the call around
   * 250ms and uses the response for the live footer + per-option
   * dimming + the revenue histogram.
   */
  @Get('projects/filter-counts')
  @RequirePermission('projects:view_own')
  async filterCounts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = projectFilterCountsQuerySchema.parse(rawQuery);
    return this.projects.getFilterCounts(user, query);
  }

  @Get('projects/:id')
  @RequirePermission('projects:view_own')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projects.findOne(user, id);
  }

  @Get('projects/:id/commission-preview')
  @RequirePermission('projects:view_own')
  async commissionPreview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projects.commissionPreview(user, id);
  }

  /* ---------- Project writes ---------- */

  @Post('projects')
  @RequirePermission('projects:create')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = projectCreateSchema.parse(body);
    return this.projects.create(user, input);
  }

  @Patch('projects/:id')
  @RequirePermission('projects:update')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = projectUpdateSchema.parse(body);
    return this.projects.update(user, id, input);
  }

  @Delete('projects/:id')
  @RequirePermission('projects:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.projects.softDelete(user, id);
  }

  @Post('projects/:id/change-status')
  @RequirePermission('projects:change_status')
  async changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = projectChangeStatusSchema.parse(body);
    return this.projects.changeStatus(user, id, input);
  }

  @Post('projects/:id/assign-role')
  @RequirePermission('projects:assign_roles')
  async assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = projectAssignmentInputSchema.parse(body);
    return this.projects.assignRole(user, id, input);
  }

  @Delete('projects/:id/assign-role/:assignmentId')
  @RequirePermission('projects:assign_roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    await this.projects.removeAssignment(user, id, assignmentId);
  }

  /* ---------- Project categories ---------- */

  @Get('project-categories')
  @RequirePermission('projects:view_own')
  async listCategories() {
    return this.projects.listCategories();
  }

  @Get('project-categories/tree')
  @RequirePermission('projects:view_own')
  async categoryTree() {
    return this.projects.categoryTree();
  }

  @Post('project-categories')
  @RequirePermission('projects:manage_categories')
  async createCategory(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = projectCategoryCreateSchema.parse(body);
    return this.projects.createCategory(user, input);
  }

  @Patch('project-categories/:id')
  @RequirePermission('projects:manage_categories')
  async updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = projectCategoryUpdateSchema.parse(body);
    return this.projects.updateCategory(user, id, input);
  }
}
