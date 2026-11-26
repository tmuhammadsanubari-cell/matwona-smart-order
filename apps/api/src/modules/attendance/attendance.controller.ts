import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { attendanceClockSchema } from 'shared';
import type {
  ApiSuccess,
  AttendanceClockInput,
  AuthUser,
  StaffAttendanceDto,
  StaffPinOptionDto,
} from 'shared';
import { Roles } from '../../common/decorators/auth.decorators.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AttendanceService } from './attendance.service.js';

@Controller('attendance')
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly attendance: AttendanceService) {}

  @Roles('CASHIER', 'ADMIN')
  @Get('staff-options')
  async staffOptions(@CurrentUser() user: AuthUser): Promise<ApiSuccess<StaffPinOptionDto[]>> {
    return { success: true, data: await this.attendance.listStaffOptions(user.outletId) };
  }

  @Roles('CASHIER', 'ADMIN')
  @Post('clock')
  async clock(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(attendanceClockSchema)) body: AttendanceClockInput,
  ): Promise<ApiSuccess<StaffAttendanceDto>> {
    return { success: true, data: await this.attendance.clock(user.outletId, body) };
  }

  @Roles('ADMIN')
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ): Promise<ApiSuccess<StaffAttendanceDto[]>> {
    return { success: true, data: await this.attendance.listLogs(user.outletId, from, to, userId) };
  }
}
