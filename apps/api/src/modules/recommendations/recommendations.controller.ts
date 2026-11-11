import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { ApiSuccess, AuthUser } from 'shared';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RecommendationsService } from './recommendations.service.js';

@Controller('recommendations')
export class RecommendationsController {
  constructor(@Inject(RecommendationsService) private readonly recoService: RecommendationsService) {}

  @Roles('ADMIN')
  @Get('rules')
  async getRules(@CurrentUser() user: AuthUser): Promise<ApiSuccess<unknown>> {
    const rules = await this.recoService.getRules(user.outletId);
    return { success: true, data: rules };
  }

  @Roles('ADMIN')
  @Get('model-status')
  async getModelStatus(@CurrentUser() user: AuthUser): Promise<ApiSuccess<unknown>> {
    const status = await this.recoService.getModelStatus(user.outletId);
    return { success: true, data: status };
  }

  @Public()
  @Get('suggest')
  async suggest(
    @Query('outletId') outletId: string,
    @Query('itemIds') itemIds?: string,
  ): Promise<ApiSuccess<unknown>> {
    const ids = itemIds ? itemIds.split(',').filter(Boolean) : [];
    const recs = await this.recoService.getRecommendations(outletId, ids);
    return { success: true, data: recs };
  }
}
