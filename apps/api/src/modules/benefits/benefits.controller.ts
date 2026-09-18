import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { benefitPolicyPublishSchema, expenseMonthSchema } from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { BenefitsService } from './benefits.service';

@Controller('benefits')
export class BenefitsController {
  constructor(private readonly benefits: BenefitsService) {}

  @Get('policies')
  @RequirePermission('benefits:manage_policies')
  async listPolicies() {
    return this.benefits.listActivePolicies();
  }

  @Post('policies/publish')
  @RequirePermission('benefits:manage_policies')
  @HttpCode(HttpStatus.OK)
  async publish(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = benefitPolicyPublishSchema.parse(body);
    return this.benefits.publish(input.kind, input.amountPkr, user.id);
  }

  @Get('balances')
  async myBalances(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    if (!user.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile.');
    }
    const asOf = parseMonth(month);
    return this.benefits.getMyBalances(user.employeeId, asOf);
  }
}

function parseMonth(month: string | undefined): Date {
  if (!month) return new Date();
  return new Date(`${expenseMonthSchema.parse(month)}T00:00:00.000Z`);
}
