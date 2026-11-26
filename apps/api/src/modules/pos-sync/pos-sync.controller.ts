import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ErrorCode,
  olseraTestProbeSchema,
  olseraTestTokenSchema,
  type ApiSuccess,
  type AuthUser,
  type OlseraTestProbeInput,
  type OlseraTestProbeResult,
  type OlseraTestTokenInput,
  type OlseraTestTokenResult,
} from 'shared';
import { AppException } from '../../common/app.exception.js';
import { MappingEntity } from '../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OlseraTestService } from './olsera-test.service.js';
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
  constructor(
    @Inject(PosSyncService) private readonly posSync: PosSyncService,
    @Inject(OlseraTestService) private readonly olseraTest: OlseraTestService,
  ) {}

  @Get('olsera-test/endpoints')
  listSafeOlseraEndpoints() {
    return { success: true, data: this.olseraTest.getSafeEndpoints() };
  }

  @Post('olsera-test/token')
  async testOlseraToken(
    @Body(new ZodValidationPipe(olseraTestTokenSchema)) body: OlseraTestTokenInput,
  ): Promise<ApiSuccess<OlseraTestTokenResult>> {
    return { success: true, data: await this.olseraTest.fetchToken(body) };
  }

  @Post('olsera-test/probe')
  async testOlseraReadProbe(
    @Body(new ZodValidationPipe(olseraTestProbeSchema)) body: OlseraTestProbeInput,
  ): Promise<ApiSuccess<OlseraTestProbeResult>> {
    return { success: true, data: await this.olseraTest.probeReadOnly(body) };
  }

  @Get('mapping')
  async getMapping(
    @CurrentUser() user: AuthUser,
    @Query('entity') entityStr?: string,
  ): Promise<ApiSuccess<Record<string, string>>> {
    const entity = entityStr === 'HISTORY_IMPORT' ? MappingEntity.HISTORY_IMPORT : MappingEntity.PRODUCT;
    const mapping = await this.posSync.getMapping(user.outletId, entity);
    return { success: true, data: mapping };
  }

  @Put('mapping')
  async saveMapping(
    @CurrentUser() user: AuthUser,
    @Body('entity') entityStr: string,
    @Body('mapping') mapping: Record<string, string>,
  ): Promise<ApiSuccess<Record<string, string>>> {
    const entity = entityStr === 'HISTORY_IMPORT' ? MappingEntity.HISTORY_IMPORT : MappingEntity.PRODUCT;
    const result = await this.posSync.saveMapping(user.outletId, entity, mapping);
    return { success: true, data: result };
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: UploadedFileShape,
    @Body('columnMapping') columnMappingJson?: string,
    @Body('saveMapping') saveMappingFlag?: string,
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

    const shouldSave = saveMappingFlag === 'true' || saveMappingFlag === '1';

    const result = await this.posSync.previewProducts(
      user.outletId,
      buffer,
      file?.originalname,
      mapping,
      user.id,
      shouldSave,
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

  @Post('transactions/import')
  @UseInterceptors(FileInterceptor('file'))
  async importTransactions(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: UploadedFileShape,
  ): Promise<
    ApiSuccess<{
      importedCount: number;
      skippedCount: number;
      errors: unknown[];
    }>
  > {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'File CSV transaksi wajib diunggah.');
    }

    const result = await this.posSync.importTransactions(
      user.outletId,
      file.buffer,
      file.originalname,
      user.id,
    );

    return { success: true, data: result };
  }
}
