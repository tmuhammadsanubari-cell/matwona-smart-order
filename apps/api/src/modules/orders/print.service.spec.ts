import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINTER_STATIONS } from 'shared';
import { buildSplitTickets, encodeEscPosTicket, type OrderWithStationItems } from './print.service.js';

describe('PrintService (Split Print Station)', () => {
  const sampleOrder = {
    id: 'ord-1',
    orderCode: 'MTW-261126-0001',
    outletId: 'out-1',
    tableId: 'tbl-1',
    customerName: 'Budi',
    customerPhone: null,
    status: 'CONFIRMED',
    paymentMethod: 'CASHIER',
    paymentStatus: 'UNPAID',
    subtotalAmount: 46000,
    discountAmount: 0,
    totalAmount: 46000,
    idempotencyKey: null,
    handledByUserId: null,
    paidByUserId: null,
    cancelReason: null,
    source: 'DIGITAL',
    externalRef: null,
    paidAt: null,
    exportedToPosAt: null,
    createdAt: new Date('2026-11-26T05:00:00Z'),
    updatedAt: new Date('2026-11-26T05:00:00Z'),
    table: { label: '3' },
    items: [
      {
        id: 'oi-1',
        orderId: 'ord-1',
        menuItemId: 'm-1',
        promoId: null,
        itemNameSnapshot: 'Matwona Sambal Matah Jumbo',
        quantity: 1,
        unitPrice: 29000,
        discountAmount: 0,
        lineTotal: 29000,
        note: 'pisahkan sambal',
        fromRecommendation: false,
        createdAt: new Date(),
        menuItem: { category: { name: 'Olahan Tuna', printerStation: 'kitchen' } },
      },
      {
        id: 'oi-2',
        orderId: 'ord-1',
        menuItemId: 'm-2',
        promoId: null,
        itemNameSnapshot: 'Kopi Susu Classic Ice',
        quantity: 1,
        unitPrice: 17000,
        discountAmount: 0,
        lineTotal: 17000,
        note: 'less sugar',
        fromRecommendation: false,
        createdAt: new Date(),
        menuItem: { category: { name: 'Signature Coffee', printerStation: 'bar' } },
      },
    ],
  } as unknown as OrderWithStationItems;

  it('memisahkan tiket kasir, kitchen (makanan), dan bar (minuman)', () => {
    const tickets = buildSplitTickets(
      sampleOrder,
      DEFAULT_PRINTER_STATIONS,
      'Matwona',
      'Jl. Matwona No. 12',
      'SELF_PICKUP_PAGER',
    );

    expect(tickets.map((t) => t.stationId)).toEqual(['cashier', 'kitchen', 'bar']);

    const cashier = tickets[0]!;
    expect(cashier.items).toHaveLength(2);
    expect(cashier.plainText).toContain('Self Pick-up (Ambil Pager)');
    expect(cashier.totalAmount).toBe(46000);

    const kitchen = tickets[1]!;
    expect(kitchen.items.map((i) => i.name)).toEqual(['Matwona Sambal Matah Jumbo']);
    expect(kitchen.plainText).toContain('CATATAN: pisahkan sambal');
    expect(kitchen.plainText).not.toContain('Kopi Susu Classic Ice');

    const bar = tickets[2]!;
    expect(bar.items.map((i) => i.name)).toEqual(['Kopi Susu Classic Ice']);
    expect(bar.plainText).toContain('CATATAN: less sugar');
  });

  it('menghasilkan buffer ESC/POS yang valid dengan init & partial cut', () => {
    const tickets = buildSplitTickets(
      sampleOrder,
      DEFAULT_PRINTER_STATIONS,
      'Matwona',
      'Jl. Matwona No. 12',
      'TABLE_SERVICE',
    );
    const buf = encodeEscPosTicket(tickets[1]!);
    expect(buf.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
    expect(buf.subarray(buf.length - 4)).toEqual(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    expect(buf.toString('ascii')).toContain('MTW-261126-0001');
  });
});
