import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { RateLimitService } from './rate-limit.service.js';

@Global()
@Module({
  providers: [CacheService, RateLimitService],
  exports: [CacheService, RateLimitService],
})
export class RedisModule {}
