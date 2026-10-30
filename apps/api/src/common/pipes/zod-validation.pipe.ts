import { PipeTransform } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { ZodType } from 'zod';
import { AppException } from '../app.exception.js';

/**
 * Validasi body/query dengan skema Zod dari packages/shared.
 * Pemakaian: @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Data yang dikirim tidak valid.', { fields });
    }
    return result.data;
  }
}
