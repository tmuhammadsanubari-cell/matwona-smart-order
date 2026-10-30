import { Body, Controller, Get, Headers, Inject, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import {
  cancelOrderSchema,
  createOrderSchema,
  ErrorCode,
  idempotencyKeySchema,
  ORDER_HEADER,
  orderListQuerySchema,
  updateOrderStatusSchema,
} from 'shared';
import type {
  ApiSuccess,
  AuthUser,
  CancelOrderInput,
  CreateOrderInput,
  OrderListQuery,
  PublicOrderDto,
  StaffOrderDto,
  UpdateOrderStatusInput,
} from 'shared';
import { AppException } from '../../common/app.exception.js';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { uuidParam, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';
import { StaffOrdersService } from './staff-orders.service.js';

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

/** Kelola pesanan oleh kasir & admin (FR-006, FR-008). */
@Roles('CASHIER', 'ADMIN')
@Controller('orders')
export class OrdersController {
  constructor(@Inject(StaffOrdersService) private readonly orders: StaffOrdersService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(orderListQuerySchema)) query: OrderListQuery,
  ): Promise<ApiSuccess<StaffOrderDto[]>> {
    return { success: true, data: await this.orders.list(user.outletId, query) };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', uuidParam()) id: string): Promise<ApiSuccess<StaffOrderDto>> {
    return { success: true, data: await this.orders.get(user.outletId, id) };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) body: UpdateOrderStatusInput,
  ): Promise<ApiSuccess<StaffOrderDto>> {
    return { success: true, data: await this.orders.updateStatus(user, id, body) };
  }

  @Post(':id/mark-paid')
  async markPaid(@CurrentUser() user: AuthUser, @Param('id', uuidParam()) id: string): Promise<ApiSuccess<StaffOrderDto>> {
    return { success: true, data: await this.orders.markPaid(user, id) };
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(cancelOrderSchema)) body: CancelOrderInput,
  ): Promise<ApiSuccess<StaffOrderDto>> {
    return { success: true, data: await this.orders.cancel(user, id, body.reason) };
  }
}
