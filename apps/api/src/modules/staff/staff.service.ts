import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
  hasPin?: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  pinHash: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const toStaffDto = (u: {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
  pinHash?: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}): StaffDto => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  hasPin: Boolean(u.pinHash),
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

@Injectable()
export class StaffService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(outletId: string): Promise<StaffDto[]> {
    const users = await this.prisma.user.findMany({
      where: { outletId },
      select: staffSelect,
      orderBy: { createdAt: 'asc' },
    });
    return users.map(toStaffDto);
  }

  async create(
    outletId: string,
    data: { name: string; email: string; password?: string; role: 'ADMIN' | 'CASHIER'; pin?: string },
  ): Promise<StaffDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Email sudah digunakan oleh staf lain.');
    }

    const defaultPassword = data.password ?? (data.role === 'ADMIN' ? 'Admin123!' : 'Kasir123!');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const pinHash = data.pin ? await bcrypt.hash(data.pin.trim(), 8) : null;

    const user = await this.prisma.user.create({
      data: {
        outletId,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        ...(pinHash ? { pinHash } : {}),
        role: data.role,
        isActive: true,
      },
      select: staffSelect,
    });

    return toStaffDto(user);
  }

  async toggleActive(outletId: string, userId: string, currentUserId: string): Promise<StaffDto> {
    if (userId === currentUserId) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Tidak dapat menonaktifkan akun sendiri.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, outletId },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Staf tidak ditemukan.');
    }

    const nextActiveState = !user.isActive;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: nextActiveState },
      select: staffSelect,
    });

    // Revoke semua sesi aktif jika akun dinonaktifkan
    if (!nextActiveState) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return toStaffDto(updated);
  }

  async resetPassword(outletId: string, userId: string, newPassword: string): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Password baru minimal 8 karakter.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, outletId },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Staf tidak ditemukan.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke semua refresh token lama agar pengguna harus login dengan password baru
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password staf berhasil direset.' };
  }

  async setPin(outletId: string, userId: string, pin: string): Promise<StaffDto> {
    if (!/^\d{4,6}$/.test(pin.trim())) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'PIN absensi harus 4–6 digit angka.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, outletId },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Staf tidak ditemukan.');
    }

    const pinHash = await bcrypt.hash(pin.trim(), 8);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
      select: staffSelect,
    });

    return toStaffDto(updated);
  }

  async deleteStaff(outletId: string, userId: string, currentUserId: string): Promise<void> {
    if (userId === currentUserId) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Tidak dapat menghapus akun sendiri.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, outletId },
    });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Staf tidak ditemukan.');
    }

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
