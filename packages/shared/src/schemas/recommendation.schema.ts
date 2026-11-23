import { z } from 'zod';

export const recoSourceEnum = z.enum(['CART_ASSOCIATION', 'POPULAR_NOW']);
export const recoEventTypeEnum = z.enum(['IMPRESSION', 'CLICK', 'ADD_TO_CART', 'PURCHASED']);

export const recommendationEventItemSchema = z.object({
  menuItemId: z.string().uuid('menuItemId harus berformat UUID'),
  eventType: recoEventTypeEnum,
  source: recoSourceEnum.default('CART_ASSOCIATION'),
  modelVersion: z.string().max(30).optional(),
  orderId: z.string().uuid().optional(),
});

export const recommendationEventBatchSchema = z.object({
  outletId: z.string().uuid('outletId harus berformat UUID'),
  sessionId: z.string().min(1, 'sessionId wajib diisi').max(40),
  events: z.array(recommendationEventItemSchema).min(1, 'Minimal 1 event').max(50),
});

export type RecommendationEventItem = z.infer<typeof recommendationEventItemSchema>;
export type RecommendationEventBatchInput = z.infer<typeof recommendationEventBatchSchema>;
