import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ErrorCode } from 'shared';
import type { AttendanceClockInput, StaffAttendanceDto, StaffPinOptionDto } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { wibDate, wibDayRange } from '../../common/wib.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AttendanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listStaffOptions(outletId: string): Promise<StaffPinOptionDto[]> {
    const [users, openShifts] = await Promise.all([
      this.prisma.user.findMany({
        where: { outletId, isActive: true },
        select: { id: true, name: true, role: true, pinHash: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.staffAttendance.findMany({
        where: { outletId, clockOutAt: null },
        select: { userId: true, clockInAt: true },
        orderBy: { clockInAt: 'desc' },
      }),
    ]);

    const openByUser = new Map<string, Date>();
    for (const s of openShifts) {
      if (!openByUser.has(s.userId)) openByUser.set(s.userId, s.clockInAt);
    }

    return users.map((u) => {
      const openAt = openByUser.get(u.id);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        hasPin: Boolean(u.pinHash),
        clockedIn: Boolean(openAt),
        lastClockInAt: openAt?.toISOString() ?? null,
      };
    });
  }

  async clock(outletId: string, input: AttendanceClockInput): Promise<StaffAttendanceDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: input.userId, outletId, isActive: true },
      select: { id: true, name: true, role: true, pinHash: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Staf aktif tidak ditemukan.');
    }
    if (!user.pinHash) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'PIN absensi untuk staf ini belum diatur oleh Admin.');
    }

    const ok = await bcrypt.compare(input.pin.trim(), user.pinHash);
    if (!ok) {
      throw new AppException(ErrorCode.UNAUTHORIZED, 'PIN absensi salah. Silakan coba lagi.');
    }

    const open = await this.prisma.staffAttendance.findFirst({
      where: { outletId, userId: user.id, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });

    if (input.action === 'IN') {
      if (open) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, `${user.name} sudah melakukan absen masuk dan belum absen pulang.`);
      }
      const created = await this.prisma.staffAttendance.create({
        data: {
          outletId,
          userId: user.id,
          note: input.note?.trim() || null,
        },
        include: { user: { select: { name: true, role: true } } },
      });
      return this.toDto(created);
    }

    if (!open) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, `${user.name} belum melakukan absen masuk.`);
    }

    const updated = await this.prisma.staffAttendance.update({
      where: { id: open.id },
      data: {
        clockOutAt: new Date(),
        ...(input.note ? { note: input.note.trim() } : {}),
      },
      include: { user: { select: { name: true, role: true } } },
    });
    return this.toDto(updated);
  }

  async listLogs(outletId: string, from?: string, to?: string, userId?: string): Promise<StaffAttendanceDto[]> {
    const today = wibDate(new Date());
    const defaultFrom = wibDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const range = wibDayRange(from ?? defaultFrom, to ?? today);

    const rows = await this.prisma.staffAttendance.findMany({
      where: {
        outletId,
        clockInAt: range,
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { clockInAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.toDto(r));
  }

  private toDto(row: {
    id: string;
    userId: string;
    clockInAt: Date;
    clockOutAt: Date | null;
    note: string | null;
    user: { name: string; role: 'ADMIN' | 'CASHIER' };
  }): StaffAttendanceDto {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      userRole: row.user.role,
      clockInAt: row.clockInAt.toISOString(),
      clockOutAt: row.clockOutAt?.toISOString() ?? null,
      note: row.note,
    };
  }
}
