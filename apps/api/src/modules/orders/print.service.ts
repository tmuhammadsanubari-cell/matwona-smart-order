import net from 'node:net';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DEFAULT_PRINTER_STATIONS, ErrorCode, formatRupiah } from 'shared';
import type { PrinterStationConfig, PrintStationResult, ServiceMode, SplitPrintTicket } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { orderInclude, type OrderWithItems } from './order.mapper.js';

export type OrderWithStationItems = Omit<OrderWithItems, 'items'> & {
  items: Array<
    OrderWithItems['items'][number] & {
      menuItem: { category: { name: string; printerStation: string } };
    }
  >;
};

const SEPARATOR = '================================';
const DASHES = '--------------------------------';

/**
 * Layanan cetak struk kasir & split ticket per station dapur/bar (USB/Bluetooth browser + LAN Ethernet ESC/POS).
 */
@Injectable()
export class PrintService {
  private readonly logger = new Logger('PrintService');

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSplitTickets(outletId: string, orderId: string): Promise<SplitPrintTicket[]> {
    const [outlet, order] = await Promise.all([
      this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId } }),
      this.prisma.order.findFirst({
        where: { id: orderId, outletId },
        include: {
          table: orderInclude.table,
          items: {
            orderBy: { createdAt: 'asc' },
            include: {
              menuItem: {
                select: {
                  category: { select: { name: true, printerStation: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    if (!order) throw new AppException(ErrorCode.NOT_FOUND, 'Pesanan tidak ditemukan.');

    const stations = this.resolveStations(outlet.printerStations);
    return buildSplitTickets(
      order,
      stations,
      outlet.name,
      outlet.address,
      (outlet.serviceMode as ServiceMode) || 'SELF_PICKUP_PAGER',
    );
  }

  async printOrder(outletId: string, orderId: string, stationId?: string): Promise<PrintStationResult[]> {
    const tickets = await this.getSplitTickets(outletId, orderId);
    const targets = stationId ? tickets.filter((t) => t.stationId === stationId) : tickets;

    if (targets.length === 0) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Tiket untuk station printer tersebut tidak ditemukan pada pesanan ini.');
    }

    const results: PrintStationResult[] = [];
    for (const ticket of targets) {
      if (ticket.type !== 'NETWORK_LAN') {
        results.push({
          stationId: ticket.stationId,
          stationName: ticket.stationName,
          type: ticket.type,
          success: true,
          message: 'Siap dicetak lewat dialog browser / printer Bluetooth perangkat kasir.',
        });
        continue;
      }

      if (!ticket.host) {
        results.push({
          stationId: ticket.stationId,
          stationName: ticket.stationName,
          type: ticket.type,
          success: false,
          message: `IP Address printer LAN untuk ${ticket.stationName} belum diatur.`,
        });
        continue;
      }

      const buf = encodeEscPosTicket(ticket);
      const sent = await this.sendToLanPrinter(ticket.host, ticket.port ?? 9100, buf);
      results.push({
        stationId: ticket.stationId,
        stationName: ticket.stationName,
        type: ticket.type,
        success: sent.ok,
        message: sent.message,
      });
    }
    return results;
  }

  async testPrinter(outletId: string, stationId: string): Promise<PrintStationResult> {
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });
    const stations = this.resolveStations(outlet.printerStations);
    const station = stations.find((s) => s.id === stationId);
    if (!station) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Konfigurasi printer station tidak ditemukan.');
    }

    if (station.type !== 'NETWORK_LAN') {
      return {
        stationId: station.id,
        stationName: station.name,
        type: station.type,
        success: true,
        message: `Station "${station.name}" menggunakan mode browser/Bluetooth (cetak via tombol Cetak Struk di kasir).`,
      };
    }

    if (!station.host) {
      return {
        stationId: station.id,
        stationName: station.name,
        type: station.type,
        success: false,
        message: 'IP Address printer LAN belum diisi.',
      };
    }

    const testTicket: SplitPrintTicket = {
      stationId: station.id,
      stationName: station.name,
      type: station.type,
      host: station.host,
      port: station.port ?? 9100,
      orderCode: 'TEST-PRINTER',
      table: 'UJI',
      customerName: 'Tes Koneksi LAN',
      createdAt: new Date().toISOString(),
      paymentMethod: 'CASHIER',
      paymentStatus: 'PAID',
      serviceMode: 'SELF_PICKUP_PAGER',
      items: [
        {
          name: `Tes Koneksi ${station.name}`,
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          note: `${station.brand ?? 'Thermal'} · ${station.host}:${station.port ?? 9100}`,
          categoryName: 'Sistem',
        },
      ],
      plainText: [
        SEPARATOR,
        `   TEST PRINTER: ${station.name.toUpperCase()}`,
        SEPARATOR,
        `Merek : ${station.brand ?? 'Generic ESC/POS'}`,
        `Host  : ${station.host}:${station.port ?? 9100}`,
        `Waktu : ${new Date().toLocaleString('id-ID')}`,
        DASHES,
        'Printer LAN terhubung dengan baik.',
        SEPARATOR,
      ].join('\n'),
    };

    const res = await this.sendToLanPrinter(station.host, station.port ?? 9100, encodeEscPosTicket(testTicket));
    return {
      stationId: station.id,
      stationName: station.name,
      type: station.type,
      success: res.ok,
      message: res.message,
    };
  }

  resolveStations(raw: unknown): PrinterStationConfig[] {
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as PrinterStationConfig[];
    }
    return DEFAULT_PRINTER_STATIONS;
  }

  async sendToLanPrinter(
    host: string,
    port: number,
    data: Buffer,
    timeoutMs = 2500,
  ): Promise<{ ok: boolean; message: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (ok: boolean, message: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ ok, message });
      };

      socket.setTimeout(timeoutMs);
      socket.once('timeout', () => {
        finish(false, `Timeout menghubungi printer ${host}:${port}. Pastikan printer menyala & satu jaringan LAN.`);
      });
      socket.once('error', (err) => {
        this.logger.warn(`Printer LAN ${host}:${port} error: ${err.message}`);
        finish(false, `Gagal terhubung ke printer ${host}:${port} (${err.message}).`);
      });

      socket.connect(port, host, () => {
        socket.write(data, (writeErr) => {
          if (writeErr) {
            finish(false, `Gagal mengirim data ESC/POS ke ${host}:${port}: ${writeErr.message}`);
          } else {
            socket.end(() => finish(true, `Struk berhasil dikirim ke printer LAN ${host}:${port}.`));
          }
        });
      });
    });
  }
}

export function buildSplitTickets(
  order: OrderWithStationItems,
  stations: PrinterStationConfig[],
  outletName: string,
  outletAddress: string,
  serviceMode: ServiceMode,
): SplitPrintTicket[] {
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const tableLabel = order.table?.label ?? '-';
  const timeStr = new Date(order.createdAt).toLocaleString('id-ID');

  const cashierStation = stationById.get('cashier') ?? DEFAULT_PRINTER_STATIONS[0]!;
  const mappedItems = order.items.map((it) => ({
    name: it.itemNameSnapshot,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
    note: it.note,
    categoryName: it.menuItem?.category?.name ?? 'Lainnya',
    stationId: it.menuItem?.category?.printerStation ?? 'kitchen',
  }));

  const cashierLines = [
    SEPARATOR,
    `         ${outletName.toUpperCase()}`,
    `    ${outletAddress}`,
    SEPARATOR,
    `Order  : ${order.orderCode}`,
    `Meja   : ${tableLabel}`,
    `Waktu  : ${timeStr}`,
    `Nama   : ${order.customerName}`,
    DASHES,
    ...mappedItems.map(
      (it) =>
        `${it.quantity}x ${it.name}\n   @${formatRupiah(it.unitPrice)} = ${formatRupiah(it.lineTotal)}` +
        (it.note ? `\n   (Catatan: ${it.note})` : ''),
    ),
    DASHES,
    `Subtotal   : ${formatRupiah(order.subtotalAmount)}`,
    ...(order.discountAmount > 0 ? [`Diskon     : -${formatRupiah(order.discountAmount)}`] : []),
    `TOTAL      : ${formatRupiah(order.totalAmount)}`,
    `Pembayaran : ${order.paymentMethod === 'CASHIER' ? 'KASIR' : 'QRIS'} (${order.paymentStatus})`,
    ...(serviceMode === 'SELF_PICKUP_PAGER' ? ['Layanan    : Self Pick-up (Ambil Pager)'] : []),
    SEPARATOR,
    ' Terima Kasih Atas Kunjungan Anda',
    SEPARATOR,
  ];

  const tickets: SplitPrintTicket[] = [
    {
      stationId: cashierStation.id,
      stationName: cashierStation.name,
      type: cashierStation.type,
      host: cashierStation.host,
      port: cashierStation.port,
      orderCode: order.orderCode,
      table: tableLabel,
      customerName: order.customerName,
      createdAt: order.createdAt.toISOString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      serviceMode,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      items: mappedItems.map(({ stationId: _s, ...rest }) => rest),
      plainText: cashierLines.join('\n'),
    },
  ];

  // Kelompokkan item ke masing-masing station non-kasir (Kitchen, Bar, dll.)
  const byStation = new Map<string, typeof mappedItems>();
  for (const item of mappedItems) {
    if (item.stationId === 'cashier') continue;
    const list = byStation.get(item.stationId) ?? [];
    list.push(item);
    byStation.set(item.stationId, list);
  }

  for (const [stId, stationItems] of byStation.entries()) {
    const stationCfg = stationById.get(stId) ?? {
      id: stId,
      name: stId === 'bar' ? 'Bar & Minuman' : 'Dapur (Kitchen)',
      type: 'BROWSER' as const,
      isActive: true,
    };
    if (!stationCfg.isActive) continue;

    const prepLines = [
      SEPARATOR,
      `  [TIKET ${stationCfg.name.toUpperCase()}]`,
      SEPARATOR,
      `MEJA   : ${tableLabel}   (${order.customerName})`,
      `ORDER  : ${order.orderCode}`,
      `WAKTU  : ${timeStr}`,
      DASHES,
      ...stationItems.flatMap((it) => [
        `${it.quantity}x ${it.name.toUpperCase()}`,
        ...(it.note ? [`   >> CATATAN: ${it.note}`] : []),
      ]),
      SEPARATOR,
    ];

    tickets.push({
      stationId: stationCfg.id,
      stationName: stationCfg.name,
      type: stationCfg.type,
      host: stationCfg.host,
      port: stationCfg.port,
      orderCode: order.orderCode,
      table: tableLabel,
      customerName: order.customerName,
      createdAt: order.createdAt.toISOString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      serviceMode,
      items: stationItems.map(({ stationId: _s, ...rest }) => rest),
      plainText: prepLines.join('\n'),
    });
  }

  return tickets;
}

/** Generate perintah biner ESC/POS standar (kompatibel Silicon / Epson / Generic 58mm & 80mm). */
export function encodeEscPosTicket(ticket: SplitPrintTicket): Buffer {
  const ESC = 0x1b;
  const GS = 0x1d;
  const chunks: Buffer[] = [
    Buffer.from([ESC, 0x40]), // Initialize printer
    Buffer.from([ESC, 0x61, 0x01]), // Center align
    Buffer.from([GS, 0x21, 0x11]), // Double width + height
    Buffer.from(`${sanitizeAscii(ticket.stationName.toUpperCase())}\n`, 'ascii'),
    Buffer.from(`MEJA ${sanitizeAscii(ticket.table)}\n`, 'ascii'),
    Buffer.from([GS, 0x21, 0x00]), // Normal font
    Buffer.from([ESC, 0x61, 0x00]), // Left align
    Buffer.from(`${sanitizeAscii(ticket.plainText)}\n\n\n`, 'ascii'),
    Buffer.from([GS, 0x56, 0x42, 0x00]), // Partial paper cut
  ];
  return Buffer.concat(chunks);
}

const sanitizeAscii = (text: string) =>
  text
    .replaceAll('×', 'x')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll('·', '|')
    .replace(/[^\x20-\x7E\n]/g, '');
