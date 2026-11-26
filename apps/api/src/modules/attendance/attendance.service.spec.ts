/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../common/app.exception.js';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService (Absensi Staf PIN)', () => {
  const outletId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';
  let service: AttendanceService;
  let prisma: any;

  beforeEach(async () => {
    const pinHash = await bcrypt.hash('1234', 4);
    prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: userId, name: 'Kasir 1', role: 'CASHIER', pinHash },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: userId,
          name: 'Kasir 1',
          role: 'CASHIER',
          pinHash,
        }),
      },
      staffAttendance: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }: any) => ({
          id: 'att-1',
          userId: data.userId,
          clockInAt: new Date(),
          clockOutAt: null,
          note: data.note,
          user: { name: 'Kasir 1', role: 'CASHIER' },
        })),
        update: vi.fn(async ({ data }: any) => ({
          id: 'att-1',
          userId,
          clockInAt: new Date(Date.now() - 3600_000),
          clockOutAt: data.clockOutAt,
          note: data.note ?? null,
          user: { name: 'Kasir 1', role: 'CASHIER' },
        })),
      },
    };
    service = new AttendanceService(prisma);
  });

  it('menolak PIN yang salah', async () => {
    await expect(
      service.clock(outletId, { userId, pin: '9999', action: 'IN' }),
    ).rejects.toThrow(AppException);
  });

  it('mencatat absen masuk ketika PIN benar', async () => {
    const res = await service.clock(outletId, { userId, pin: '1234', action: 'IN', note: 'Shift pagi' });
    expect(res.userName).toBe('Kasir 1');
    expect(res.clockOutAt).toBeNull();
    expect(prisma.staffAttendance.create).toHaveBeenCalledTimes(1);
  });

  it('mencegah absen masuk ganda sebelum absen pulang', async () => {
    prisma.staffAttendance.findFirst.mockResolvedValue({ id: 'att-open', clockOutAt: null });
    await expect(
      service.clock(outletId, { userId, pin: '1234', action: 'IN' }),
    ).rejects.toThrow(/sudah melakukan absen masuk/);
  });

  it('mencatat absen pulang pada shift aktif', async () => {
    prisma.staffAttendance.findFirst.mockResolvedValue({ id: 'att-open', clockOutAt: null });
    const res = await service.clock(outletId, { userId, pin: '1234', action: 'OUT' });
    expect(res.clockOutAt).toBeTruthy();
    expect(prisma.staffAttendance.update).toHaveBeenCalledTimes(1);
  });
});
