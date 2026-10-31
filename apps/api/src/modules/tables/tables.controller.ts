import { Body, Controller, Get, Inject, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createTablesSchema, tablesQrQuerySchema, updateTableSchema } from 'shared';
import type {
  ApiSuccess,
  AuthUser,
  CreateTablesInput,
  DiningTableDto,
  PublicTableInfo,
  TablesQrQuery,
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

/** Kelola meja, ganti token QR & cetak PDF QR oleh admin (FR-011). */
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

  /** PDF QR siap cetak: `?ids=<uuid,uuid>&layout=a6|a4grid` (default semua meja aktif, A6). */
  @Get('qr.pdf')
  async qrPdf(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(tablesQrQuerySchema)) query: TablesQrQuery,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.tables.qrPdf(user.outletId, query);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="qr-meja-${query.layout}.pdf"`,
        'Cache-Control': 'no-store',
      })
      .send(pdf);
  }

  @Post(':id/regenerate-token')
  async regenerateToken(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidParam()) id: string,
  ): Promise<ApiSuccess<DiningTableDto>> {
    return { success: true, data: await this.tables.regenerateToken(user.outletId, id) };
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
