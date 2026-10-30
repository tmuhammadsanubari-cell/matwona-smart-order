import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from './cache.service.js';

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Rate limit fixed-window. Counter disimpan di Redis agar berlaku lintas instance;
 * saat Redis mati, jatuh ke counter in-memory per proses (tetap membatasi, walau per instance).
 */
@Injectable()
export class RateLimitService {
  private readonly memory = new Map<string, Window>();

  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  /** Catat satu hit pada `key`; true jika masih dalam batas `limit` per `windowSeconds`. */
  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const count = (await this.cache.increment(key, windowSeconds)) ?? this.hitMemory(key, windowSeconds);
    return count <= limit;
  }

  async reset(key: string): Promise<void> {
    this.memory.delete(key);
    await this.cache.del(key);
  }

  private hitMemory(key: string, windowSeconds: number): number {
    const now = Date.now();
    this.pruneExpired(now);
    const current = this.memory.get(key);
    if (!current || current.resetAt <= now) {
      this.memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return 1;
    }
    current.count += 1;
    return current.count;
  }

  private pruneExpired(now: number) {
    if (this.memory.size < 1000) return;
    for (const [key, window] of this.memory) {
      if (window.resetAt <= now) this.memory.delete(key);
    }
  }
}
