import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  app.enableShutdownHooks();

  const port = Number(process.env.APP_PORT ?? 4000);
  await app.listen(port);
  console.log(`API berjalan di http://localhost:${port}`);
}

await bootstrap();
