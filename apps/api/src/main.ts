import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis();
  app.useWebSocketAdapter(ioAdapter);
  app.enableShutdownHooks();

  const port = Number(process.env.APP_PORT ?? 4000);
  await app.listen(port);
  console.log(`API berjalan di http://localhost:${port}`);
}

await bootstrap();
