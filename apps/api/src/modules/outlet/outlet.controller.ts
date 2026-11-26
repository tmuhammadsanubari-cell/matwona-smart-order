import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common';
import { outletSettingsUpdateSchema } from 'shared';
import type {
  ApiSuccess,
  AuthUser,
  OutletSettingsDto,
  OutletSettingsUpdateInput,
  PrintStationResult,
} from 'shared';
import { z } from 'zod';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { NotificationTestResult } from '../notifications/notifications.service.js';
import { OutletService, type CashierOperationalInfo } from './outlet.service.js';

const testPrinterBodySchema = z.object({
  stationId: z.string().trim().min(1).max(40),
});

@Controller('outlet')
export class OutletController {
  constructor(@Inject(OutletService) private readonly outlet: OutletService) {}

  @Roles('CASHIER', 'ADMIN')
  @Get('cashier-info')
  async getCashierInfo(@CurrentUser() user: AuthUser): Promise<ApiSuccess<CashierOperationalInfo>> {
    return { success: true, data: await this.outlet.getCashierInfo(user.outletId) };
  }

  @Roles('CASHIER', 'ADMIN')
  @Post('stock-reminder/ping')
  async pingStockReminder(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.outlet.pingStockReminder(user.outletId) };
  }

  @Roles('ADMIN')
  @Get('settings')
  async getSettings(@CurrentUser() user: AuthUser): Promise<ApiSuccess<OutletSettingsDto>> {
    return { success: true, data: await this.outlet.getSettings(user.outletId) };
  }

  @Roles('ADMIN')
  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(outletSettingsUpdateSchema)) body: OutletSettingsUpdateInput,
  ): Promise<ApiSuccess<OutletSettingsDto>> {
    return { success: true, data: await this.outlet.updateSettings(user.outletId, body) };
  }

  @Roles('ADMIN')
  @Post('notifications/test')
  async testNotification(@CurrentUser() user: AuthUser): Promise<ApiSuccess<NotificationTestResult>> {
    return { success: true, data: await this.outlet.testNotification(user.outletId) };
  }

  @Roles('ADMIN')
  @Post('printers/test')
  async testPrinter(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(testPrinterBodySchema)) body: { stationId: string },
  ): Promise<ApiSuccess<PrintStationResult>> {
    return { success: true, data: await this.outlet.testPrinter(user.outletId, body.stationId) };
  }
}
