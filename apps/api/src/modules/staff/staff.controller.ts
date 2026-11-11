import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { ApiSuccess, AuthUser } from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
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
    @Body() body: { name: string; email: string; password?: string; role: 'ADMIN' | 'CASHIER' },
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

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<{ message: string }>> {
    await this.staffService.deleteStaff(user.outletId, id, user.id);
    return { success: true, data: { message: 'Staf berhasil dihapus.' } };
  }
}
