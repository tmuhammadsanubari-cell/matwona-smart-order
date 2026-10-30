import { z } from 'zod';

// Sumber: PRD 2.2.7 & tabel menu_items (4.2)

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const menuItemSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).optional(),
  price: z.number().int().min(0),
  stock: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().max(64).optional(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type MenuAvailabilityInput = z.infer<typeof menuAvailabilitySchema>;
