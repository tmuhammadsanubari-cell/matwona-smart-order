import type { CacheService } from './cache.service.js';
import { RateLimitService } from './rate-limit.service.js';

function setup(redisCount: number | null) {
  const cache = { increment: vi.fn().mockResolvedValue(redisCount), del: vi.fn() };
  return { cache, limiter: new RateLimitService(cache as unknown as CacheService) };
}

describe('RateLimitService (NFR-009)', () => {
  it('memakai counter Redis bila tersedia', async () => {
    const { cache, limiter } = setup(5);
    expect(await limiter.hit('k', 5, 600)).toBe(true);
    expect(cache.increment).toHaveBeenCalledWith('k', 600);

    cache.increment.mockResolvedValue(6);
    expect(await limiter.hit('k', 5, 600)).toBe(false);
  });

  it('Redis mati: tetap membatasi dengan counter in-memory, reset setelah window lewat', async () => {
    vi.useFakeTimers();
    try {
      const { limiter } = setup(null);
      for (let i = 0; i < 5; i++) expect(await limiter.hit('k', 5, 600)).toBe(true);
      expect(await limiter.hit('k', 5, 600)).toBe(false);
      expect(await limiter.hit('lain', 5, 600)).toBe(true);

      vi.advanceTimersByTime(600_000);
      expect(await limiter.hit('k', 5, 600)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reset menghapus counter Redis dan in-memory', async () => {
    const { cache, limiter } = setup(null);
    for (let i = 0; i < 6; i++) await limiter.hit('k', 5, 600);
    await limiter.reset('k');
    expect(cache.del).toHaveBeenCalledWith('k');
    expect(await limiter.hit('k', 5, 600)).toBe(true);
  });
});
