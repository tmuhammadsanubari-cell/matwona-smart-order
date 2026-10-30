import { CacheService } from './cache.service.js';

describe('CacheService saat Redis tidak tersedia', () => {
  let cache: CacheService;
  const original = process.env.REDIS_URL;

  beforeAll(() => {
    // Port tertutup: koneksi pasti gagal.
    process.env.REDIS_URL = 'redis://127.0.0.1:1';
    cache = new CacheService();
  });

  afterAll(() => {
    cache.onModuleDestroy();
    process.env.REDIS_URL = original;
  });

  it('get/set/del tidak melempar error dan get dianggap cache miss dengan cepat', async () => {
    const started = Date.now();
    await expect(cache.getJson('menu:v1:matwona')).resolves.toBeNull();
    await expect(cache.setJson('menu:v1:matwona', { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(cache.del('menu:v1:matwona')).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
