import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Adapter Socket.IO berbasis Redis pub/sub agar event sampai ke semua instance API (NFR-015).
 * Bila Redis tidak tersedia saat start, tetap memakai adapter in-memory (cukup untuk satu instance).
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Redis[] = [];

  async connectToRedis(url = process.env.REDIS_URL ?? 'redis://localhost:6379'): Promise<boolean> {
    const pub = new Redis(url, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 1 });
    const sub = pub.duplicate();
    try {
      await Promise.all([pub.connect(), sub.connect()]);
    } catch (error) {
      pub.disconnect();
      sub.disconnect();
      this.logger.warn(`Redis tidak tersedia, Socket.IO memakai adapter in-memory: ${(error as Error)?.message ?? error}`);
      return false;
    }
    this.clients = [pub, sub];
    this.adapterConstructor = createAdapter(pub, sub);
    return true;
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    for (const client of this.clients) client.disconnect();
  }
}
