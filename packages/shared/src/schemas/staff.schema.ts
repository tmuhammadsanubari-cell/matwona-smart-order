import { z } from 'zod';

export const attendancePinSchema = z.string().trim().regex(/^\d{4,6}$/, 'PIN absensi harus 4–6 digit angka');

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
  role: z.enum(['ADMIN', 'CASHIER']),
  pin: attendancePinSchema.optional(),
});

export const resetStaffPasswordSchema = z.object({
  password: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export const setStaffPinSchema = z.object({
  pin: attendancePinSchema,
});

export const attendanceClockSchema = z.object({
  userId: z.uuid('ID staf tidak valid'),
  pin: attendancePinSchema,
  action: z.enum(['IN', 'OUT']),
  note: z.string().trim().max(200).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
export type SetStaffPinInput = z.infer<typeof setStaffPinSchema>;
export type AttendanceClockInput = z.infer<typeof attendanceClockSchema>;

export interface StaffPinOptionDto {
  id: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  hasPin: boolean;
  clockedIn: boolean;
  lastClockInAt: string | null;
}

export interface StaffAttendanceDto {
  id: string;
  userId: string;
  userName: string;
  userRole: 'ADMIN' | 'CASHIER';
  clockInAt: string;
  clockOutAt: string | null;
  note: string | null;
}
