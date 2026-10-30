import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

/** Jeda minimum antar log error Redis agar log tidak banjir saat Redis mati. */
const WARN_INTERVAL_MS = 30_000;

/**
 * Cache JSON di Redis. Redis bersifat opsional: semua kegagalan ditelan dan dicatat,
 * pemanggil cukup memperlakukannya sebagai cache miss lalu membaca dari database.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger('Cache');
  private readonly redis: Redis;
  private lastWarnAt = 0;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      // Gagal cepat saat Redis tidak tersedia, jangan antre perintah.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (error: Error) => this.warn(error));
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.warn(error);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.warn(error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.warn(error);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private warn(error: unknown) {
    const now = Date.now();
    if (now - this.lastWarnAt < WARN_INTERVAL_MS) return;
    this.lastWarnAt = now;
    this.logger.warn(`Redis tidak tersedia, cache dilewati: ${(error as Error)?.message ?? error}`);
  }
}
