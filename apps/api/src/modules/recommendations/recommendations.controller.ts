import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import type { ApiSuccess, AuthUser, RecommendationEventBatchInput } from 'shared';
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

  @Public()
  @Get('public')
  async publicRecommendations(
    @Query('outletId') outletId: string,
    @Query('itemIds') itemIds?: string,
  ): Promise<ApiSuccess<unknown>> {
    const ids = itemIds ? itemIds.split(',').filter(Boolean) : [];
    const recs = await this.recoService.getRecommendations(outletId, ids);
    return { success: true, data: recs };
  }

  @Public()
  @Post('events')
  async recordEvents(
    @Body() body: RecommendationEventBatchInput,
  ): Promise<ApiSuccess<{ recorded: number }>> {
    const result = await this.recoService.recordEvents(body.outletId, body.sessionId, body.events);
    return { success: true, data: result };
  }
}

@Controller('public/recommendation-events')
export class PublicRecommendationEventsController {
  constructor(@Inject(RecommendationsService) private readonly recoService: RecommendationsService) {}

  @Public()
  @Post()
  async recordEvents(
    @Body() body: RecommendationEventBatchInput,
  ): Promise<ApiSuccess<{ recorded: number }>> {
    const result = await this.recoService.recordEvents(body.outletId, body.sessionId, body.events);
    return { success: true, data: result };
  }
}
