import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

/** Konfigurasi HTTP bersama untuk main.ts dan e2e test. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
