import { Module } from '@nestjs/common';
import {
  PublicRecommendationEventsController,
  RecommendationsController,
} from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  controllers: [RecommendationsController, PublicRecommendationEventsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
