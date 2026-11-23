/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StaffService } from './staff.service.js';
import { AppException } from '../../common/app.exception.js';

describe('StaffService', () => {
  let service: StaffService;
  let mockPrisma: any;

  const outletId = '11111111-1111-1111-1111-111111111111';
  const currentUserId = '22222222-2222-2222-2222-222222222222';
  const targetUserId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      refreshToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new StaffService(mockPrisma);
  });

  describe('list', () => {
    it('returns users in outlet', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: targetUserId, name: 'Kasir Satu', email: 'kasir1@matwona.id', role: 'CASHIER', isActive: true },
      ]);

      const result = await service.list(outletId);
      expect(result).toHaveLength(1);
      expect(result[0]?.email).toBe('kasir1@matwona.id');
    });
  });

  describe('create', () => {
    it('throws VALIDATION_ERROR if email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(outletId, { name: 'Staff Baru', email: 'staff@matwona.id', role: 'CASHIER' }),
      ).rejects.toThrow(AppException);
    });

    it('creates staff with hashed default password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }: { data: any }) =>
        Promise.resolve({
          id: targetUserId,
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        }),
      );

      const created = await service.create(outletId, {
        name: 'Kasir Baru',
        email: 'kasir.baru@matwona.id',
        role: 'CASHIER',
      });

      expect(created.id).toBe(targetUserId);
      expect(created.name).toBe('Kasir Baru');
    });
  });

  describe('toggleActive', () => {
    it('throws error when attempting to toggle self', async () => {
      await expect(service.toggleActive(outletId, currentUserId, currentUserId)).rejects.toThrow(
        'Tidak dapat menonaktifkan akun sendiri',
      );
    });

    it('throws NOT_FOUND if staff does not exist in outlet', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.toggleActive(outletId, targetUserId, currentUserId)).rejects.toThrow(
        AppException,
      );
    });

    it('deactivates staff and revokes refresh tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: targetUserId, isActive: true });
      mockPrisma.user.update.mockResolvedValue({ id: targetUserId, isActive: false });

      const updated = await service.toggleActive(outletId, targetUserId, currentUserId);
      expect(updated.isActive).toBe(false);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } });
    });
  });

  describe('resetPassword', () => {
    it('validates minimum password length', async () => {
      await expect(service.resetPassword(outletId, targetUserId, 'short')).rejects.toThrow(
        'Password baru minimal 8 karakter',
      );
    });

    it('throws NOT_FOUND if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(outletId, targetUserId, 'NewPassword123!')).rejects.toThrow(
        AppException,
      );
    });

    it('hashes password and revokes active tokens on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: targetUserId, outletId });
      mockPrisma.user.update.mockResolvedValue({ id: targetUserId });

      const res = await service.resetPassword(outletId, targetUserId, 'NewPassword123!');
      expect(res.message).toBe('Password staf berhasil direset.');
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } });
    });
  });

  describe('deleteStaff', () => {
    it('throws error when attempting to delete self', async () => {
      await expect(service.deleteStaff(outletId, currentUserId, currentUserId)).rejects.toThrow(
        'Tidak dapat menghapus akun sendiri',
      );
    });

    it('deletes staff and tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: targetUserId, outletId });
      mockPrisma.user.delete.mockResolvedValue({ id: targetUserId });

      await service.deleteStaff(outletId, targetUserId, currentUserId);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: targetUserId } });
    });
  });
});
