import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import { corsOrigin } from './common/cors.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

/** Konfigurasi HTTP bersama untuk main.ts dan e2e test. */
export function configureApp(app: INestApplication) {
  // Cloud Run menaruh IP klien di X-Forwarded-For; req.ip dipakai rate limit pesanan per IP (NFR-009).
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
