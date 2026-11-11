import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { ApiSuccess, AuthUser } from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AnalyticsService, type AnalyticsSummary } from './analytics.service.js';

@Roles('ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ApiSuccess<AnalyticsSummary>> {
    const summary = await this.analytics.getSummary(user.outletId, from, to);
    return { success: true, data: summary };
  }
}
