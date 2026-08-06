import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import { DashboardService } from './dashboard.service';

/**
 * Management dashboard (Module 7 §9). One endpoint returns the full
 * snapshot — KPIs, charts, and activity feed — gated to Super Admin /
 * Finance Manager.
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('management')
  @RequirePermission('dashboard:view_management')
  async management() {
    return this.dashboard.management();
  }
}
