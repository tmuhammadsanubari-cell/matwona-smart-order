import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { ApiSuccess, AuthUser } from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PosSyncService, type PreviewResult } from './pos-sync.service.js';

interface UploadedFileShape {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Roles('ADMIN')
@Controller('pos-sync')
export class PosSyncController {
  constructor(@Inject(PosSyncService) private readonly posSync: PosSyncService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: UploadedFileShape,
    @Body('columnMapping') columnMappingJson?: string,
  ): Promise<ApiSuccess<PreviewResult>> {
    const buffer = file?.buffer;
    if (!buffer || buffer.length === 0) {
      throw new Error('File CSV tidak ditemukan');
    }

    let mapping: Record<string, string> | undefined;
    if (columnMappingJson) {
      try {
        mapping = JSON.parse(columnMappingJson);
      } catch {
        // Abaikan bila format JSON mapping salah, pakai default mapping
      }
    }

    const result = await this.posSync.previewProducts(
      user.outletId,
      buffer,
      file?.originalname,
      mapping,
      user.id,
    );

    return { success: true, data: result };
  }

  @Post('apply')
  async apply(
    @CurrentUser() user: AuthUser,
    @Body('logId') logId: string,
  ): Promise<ApiSuccess<{ applied: number }>> {
    const result = await this.posSync.applyProducts(user.outletId, logId, user.id);
    return { success: true, data: result };
  }

  @Get('export-transactions')
  async exportTransactions(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.posSync.exportTransactions(user.outletId, from, to, user.id);

    if (result.kind === 'file') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.content);
    }

    return res.json({ success: true, data: result });
  }

  @Get('history')
  async history(@CurrentUser() user: AuthUser) {
    const logs = await this.posSync.getLogs(user.outletId);
    return { success: true, data: logs };
  }
}
