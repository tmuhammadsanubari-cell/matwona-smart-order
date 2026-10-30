import { Body, Controller, Headers, Inject, Ip, Post } from '@nestjs/common';
import { createOrderSchema, ErrorCode, idempotencyKeySchema, ORDER_HEADER } from 'shared';
import type { ApiSuccess, CreateOrderInput, PublicOrderDto } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { Public } from '../../common/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

/** Pesanan pelanggan, akses dengan X-Table-Token (FR-004, FR-006). */
@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  async create(
    @Headers(ORDER_HEADER.TABLE_TOKEN) tableToken: string | undefined,
    @Headers(ORDER_HEADER.IDEMPOTENCY_KEY) idempotencyKey: string | undefined,
    @Ip() ip: string,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ): Promise<ApiSuccess<PublicOrderDto>> {
    const key = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!key.success) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Header Idempotency-Key wajib berupa UUID.', {
        fields: [{ path: 'Idempotency-Key', message: 'Wajib berupa UUID' }],
      });
    }
    const order = await this.orders.create(body, {
      tableToken: tableToken ?? '',
      idempotencyKey: key.data,
      ip,
    });
    return { success: true, data: order };
  }
}
