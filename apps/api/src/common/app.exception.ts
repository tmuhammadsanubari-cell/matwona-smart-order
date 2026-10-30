import { HttpException } from '@nestjs/common';
import { ERROR_HTTP_STATUS, ErrorCode } from 'shared';

/**
 * Satu-satunya cara melempar error bisnis. Pesan harus bahasa Indonesia dan aman ditampilkan.
 * Contoh: throw new AppException(ErrorCode.ITEM_UNAVAILABLE, 'Beberapa menu sudah habis.', { items })
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, ERROR_HTTP_STATUS[code]);
  }
}
