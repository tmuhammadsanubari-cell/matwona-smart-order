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
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class StaffService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(outletId: string): Promise<StaffDto[]> {
    const users = await this.prisma.user.findMany({
      where: { outletId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return users;
  }

  async create(
    outletId: string,
    data: { name: string; email: string; password?: string; role: 'ADMIN' | 'CASHIER' },
  ): Promise<StaffDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Email sudah digunakan oleh staf lain.');
    }

    const defaultPassword = data.password ?? (data.role === 'ADMIN' ? 'Admin123!' : 'Kasir123!');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        outletId,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return user;
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

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return updated;
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

    await this.prisma.user.delete({ where: { id: userId } });
  }
}
