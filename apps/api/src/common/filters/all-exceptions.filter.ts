import { randomUUID } from 'node:crypto';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiError, ErrorCode } from 'shared';
import { AppException } from '../app.exception.js';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  429: ErrorCode.RATE_LIMITED,
};

/** Mengubah semua error ke format { success: false, error: { code, message, details, traceId } } (PRD 4.5). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const traceId = randomUUID().slice(0, 8);

    let status = 500;
    let body: ApiError['error'] = {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
      traceId,
    };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = { code: exception.code, message: exception.message, details: exception.details, traceId };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = {
        code: STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR,
        message: exception.message,
        traceId,
      };
    }

    if (status >= 500) {
      this.logger.error(`[${traceId}]`, exception instanceof Error ? exception.stack : exception);
    }

    res.status(status).json({ success: false, error: body } satisfies ApiError);
  }
}
