/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendationsService } from './recommendations.service.js';
import { RecoEventType, RecoSource } from '../../generated/prisma/client.js';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let mockPrisma: any;
  let mockConfig: any;

  const outletId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockPrisma = {
      recommendationRule: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      recommendationModel: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      recommendationEvent: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      order: {
        count: vi.fn().mockResolvedValue(100),
      },
      orderItem: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      menuItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'item-1', name: 'Es Teh Manis', price: 8000, imageUrl: null },
          { id: 'item-2', name: 'Lemon Tea', price: 10000, imageUrl: null },
        ]),
      },
    };

    mockConfig = {
      get: vi.fn((key: string, defaultVal: any) => defaultVal),
    };

    service = new RecommendationsService(mockPrisma, mockConfig);
  });

  describe('recordEvents', () => {
    it('creates multiple recommendation event records', async () => {
      const events = [
        {
          menuItemId: '22222222-2222-2222-2222-222222222222',
          eventType: 'IMPRESSION' as const,
          source: 'CART_ASSOCIATION' as const,
          modelVersion: 'v1.0.0',
        },
        {
          menuItemId: '33333333-3333-3333-3333-333333333333',
          eventType: 'CLICK' as const,
          source: 'CART_ASSOCIATION' as const,
          modelVersion: 'v1.0.0',
        },
      ];

      const res = await service.recordEvents(outletId, 'session-abc', events);
      expect(res.recorded).toBe(2);
      expect(mockPrisma.recommendationEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            outletId,
            sessionId: 'session-abc',
            menuItemId: '22222222-2222-2222-2222-222222222222',
            eventType: RecoEventType.IMPRESSION,
            source: RecoSource.CART_ASSOCIATION,
          }),
          expect.objectContaining({
            outletId,
            sessionId: 'session-abc',
            menuItemId: '33333333-3333-3333-3333-333333333333',
            eventType: RecoEventType.CLICK,
            source: RecoSource.CART_ASSOCIATION,
          }),
        ],
      });
    });

    it('returns 0 when events array is empty', async () => {
      const res = await service.recordEvents(outletId, 'session-abc', []);
      expect(res.recorded).toBe(0);
      expect(mockPrisma.recommendationEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getRules', () => {
    it('returns seeded default rules when DB has none', async () => {
      const rules = await service.getRules(outletId);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]?.category).toBe('Paket Komplit Minuman');
    });
  });

  describe('getModelStatus', () => {
    it('returns active model metadata', async () => {
      const status = await service.getModelStatus(outletId);
      expect(status.activeModel).toBe('v1.2.0-fpgrowth');
      expect(status.hitRateAt3).toBe(0.87);
    });
  });

  describe('getRecommendations fallback', () => {
    it('returns fallback items when reco microservice is unreachable', async () => {
      const recs = await service.getRecommendations(outletId, ['item-x']);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]?.name).toBe('Es Teh Manis');
    });
  });
});
