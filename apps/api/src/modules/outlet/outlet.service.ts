import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_PRINTER_STATIONS } from 'shared';
import type {
  OutletSettingsDto,
  OutletSettingsUpdateInput,
  PrinterStationConfig,
  PrintStationResult,
  ServiceMode,
} from 'shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicMenuService } from '../menu/public-menu.service.js';
import { NotificationsService, type NotificationTestResult } from '../notifications/notifications.service.js';
import { PrintService } from '../orders/print.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export interface CashierOperationalInfo {
  qrisEnabled: boolean;
  serviceMode: ServiceMode;
  stockReminderHours: number[];
  printerStations: PrinterStationConfig[];
  lowStockItems: Array<{ id: string; name: string; stock: number | null; isAvailable: boolean }>;
}

const maskSecret = (val: string | null) => {
  if (!val) return null;
  if (val.length <= 8) return '********';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
};

@Injectable()
export class OutletService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PublicMenuService) private readonly publicMenu: PublicMenuService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(PrintService) private readonly printService: PrintService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
  ) {}

  async getSettings(outletId: string): Promise<OutletSettingsDto> {
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });
    return this.toDto(outlet);
  }

  async updateSettings(outletId: string, input: OutletSettingsUpdateInput): Promise<OutletSettingsDto> {
    const data: Record<string, unknown> = {};
    if (input.qrisEnabled !== undefined) data.qrisEnabled = input.qrisEnabled;
    if (input.serviceMode !== undefined) data.serviceMode = input.serviceMode;
    if (input.stockReminderHours !== undefined) {
      data.stockReminderHours = [...new Set(input.stockReminderHours)].sort((a, b) => a - b);
    }
    if (input.telegramBotToken !== undefined) data.telegramBotToken = input.telegramBotToken || null;
    if (input.telegramChatId !== undefined) data.telegramChatId = input.telegramChatId || null;
    if (input.whatsappWebhookUrl !== undefined) data.whatsappWebhookUrl = input.whatsappWebhookUrl || null;
    if (input.printerStations !== undefined) data.printerStations = input.printerStations;

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data,
    });

    if (input.qrisEnabled !== undefined || input.serviceMode !== undefined) {
      await this.publicMenu.invalidate(outletId);
    }

    return this.toDto(updated);
  }

  async getCashierInfo(outletId: string): Promise<CashierOperationalInfo> {
    const [outlet, flaggedItems] = await Promise.all([
      this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId } }),
      this.prisma.menuItem.findMany({
        where: {
          outletId,
          isArchived: false,
          OR: [{ isAvailable: false }, { stock: { lte: 5 } }],
        },
        select: { id: true, name: true, stock: true, isAvailable: true },
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        take: 25,
      }),
    ]);

    return {
      qrisEnabled: outlet.qrisEnabled,
      serviceMode: (outlet.serviceMode as ServiceMode) || 'SELF_PICKUP_PAGER',
      stockReminderHours: outlet.stockReminderHours,
      printerStations: this.printService.resolveStations(outlet.printerStations),
      lowStockItems: flaggedItems,
    };
  }

  async testNotification(outletId: string): Promise<NotificationTestResult> {
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });
    return this.notifications.sendTestNotification({
      name: outlet.name,
      telegramBotToken: outlet.telegramBotToken,
      telegramChatId: outlet.telegramChatId,
      whatsappWebhookUrl: outlet.whatsappWebhookUrl,
    });
  }

  async testPrinter(outletId: string, stationId: string): Promise<PrintStationResult> {
    return this.printService.testPrinter(outletId, stationId);
  }

  async pingStockReminder(outletId: string) {
    const info = await this.getCashierInfo(outletId);
    const payload = {
      message: 'Jangan lupa cek & perbarui stok menu hari ini agar pelanggan tidak memesan menu yang habis.',
      lowStockItems: info.lowStockItems.map((i) => ({ id: i.id, name: i.name, stock: i.stock })),
      triggeredAt: new Date().toISOString(),
    };
    this.realtime.stockReminder(outletId, payload);
    return payload;
  }

  private toDto(outlet: {
    id: string;
    slug: string;
    name: string;
    qrisEnabled: boolean;
    serviceMode: string;
    stockReminderHours: number[];
    telegramBotToken: string | null;
    telegramChatId: string | null;
    whatsappWebhookUrl: string | null;
    printerStations: unknown;
  }): OutletSettingsDto {
    const stations = Array.isArray(outlet.printerStations) && outlet.printerStations.length > 0
      ? (outlet.printerStations as PrinterStationConfig[])
      : DEFAULT_PRINTER_STATIONS;

    return {
      id: outlet.id,
      slug: outlet.slug,
      name: outlet.name,
      qrisEnabled: outlet.qrisEnabled,
      serviceMode: (outlet.serviceMode as ServiceMode) || 'SELF_PICKUP_PAGER',
      stockReminderHours: outlet.stockReminderHours,
      telegramBotTokenConfigured: Boolean(outlet.telegramBotToken),
      telegramBotTokenMasked: maskSecret(outlet.telegramBotToken),
      telegramChatId: outlet.telegramChatId,
      whatsappWebhookUrl: outlet.whatsappWebhookUrl,
      printerStations: stations,
    };
  }
}
