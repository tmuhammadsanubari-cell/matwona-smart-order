import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { resetStaffPasswordSchema, setStaffPinSchema } from 'shared';
import type { ApiSuccess, AuthUser, ResetStaffPasswordInput, SetStaffPinInput } from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { StaffService, type StaffDto } from './staff.service.js';

@Roles('ADMIN')
@Controller('staff')
export class StaffController {
  constructor(@Inject(StaffService) private readonly staffService: StaffService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiSuccess<StaffDto[]>> {
    const list = await this.staffService.list(user.outletId);
    return { success: true, data: list };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; email: string; password?: string; role: 'ADMIN' | 'CASHIER'; pin?: string },
  ): Promise<ApiSuccess<StaffDto>> {
    const created = await this.staffService.create(user.outletId, body);
    return { success: true, data: created };
  }

  @Patch(':id/toggle')
  async toggle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<StaffDto>> {
    const updated = await this.staffService.toggleActive(user.outletId, id, user.id);
    return { success: true, data: updated };
  }

  @Patch(':id/password')
  async resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resetStaffPasswordSchema)) body: ResetStaffPasswordInput,
  ): Promise<ApiSuccess<{ message: string }>> {
    const result = await this.staffService.resetPassword(user.outletId, id, body.password);
    return { success: true, data: result };
  }

  @Patch(':id/pin')
  async setPin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setStaffPinSchema)) body: SetStaffPinInput,
  ): Promise<ApiSuccess<StaffDto>> {
    const updated = await this.staffService.setPin(user.outletId, id, body.pin);
    return { success: true, data: updated };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<{ message: string }>> {
    await this.staffService.deleteStaff(user.outletId, id, user.id);
    return { success: true, data: { message: 'Staf berhasil dihapus.' } };
  }
}
