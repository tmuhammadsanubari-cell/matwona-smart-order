import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
  role: z.enum(['ADMIN', 'CASHIER']),
});

export const resetStaffPasswordSchema = z.object({
  password: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
