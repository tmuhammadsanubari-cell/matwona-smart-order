import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { createTablesSchema, updateTableSchema } from 'shared';
import type {
  ApiSuccess,
  AuthUser,
  CreateTablesInput,
  DiningTableDto,
  PublicTableInfo,
  UpdateTableInput,
} from 'shared';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { uuidParam, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { TablesService } from './tables.service.js';

/** Validasi token QR saat pelanggan membuka /m/<outlet>/t/<token> (FR-001). */
@Public()
@Controller('public/tables')
export class PublicTablesController {
  constructor(@Inject(TablesService) private readonly tables: TablesService) {}

  @Get(':token')
  async resolve(@Param('token') token: string): Promise<ApiSuccess<PublicTableInfo>> {
    return { success: true, data: await this.tables.resolveToken(token) };
  }
}

/** Kelola meja oleh admin (FR-011). Regenerate token & PDF QR menyusul di S2-04. */
@Roles('ADMIN')
@Controller('tables')
export class TablesController {
  constructor(@Inject(TablesService) private readonly tables: TablesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiSuccess<DiningTableDto[]>> {
    return { success: true, data: await this.tables.list(user.outletId) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTablesSchema)) body: CreateTablesInput,
  ): Promise<ApiSuccess<DiningTableDto[]>> {
    return { success: true, data: await this.tables.create(user.outletId, body) };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
    @Body(new ZodValidationPipe(updateTableSchema)) body: UpdateTableInput,
  ): Promise<ApiSuccess<DiningTableDto>> {
    return { success: true, data: await this.tables.update(user.outletId, id, body) };
  }
}
