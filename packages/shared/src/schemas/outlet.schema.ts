import { z } from 'zod';

export const SERVICE_MODES = ['SELF_PICKUP_PAGER', 'TABLE_SERVICE'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const PRINTER_STATION_TYPES = ['BROWSER', 'NETWORK_LAN', 'BLUETOOTH'] as const;
export type PrinterStationType = (typeof PRINTER_STATION_TYPES)[number];

export const printerStationSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  type: z.enum(PRINTER_STATION_TYPES),
  host: z.string().trim().max(100).nullable().optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  brand: z.string().trim().max(60).nullable().optional(),
  isActive: z.boolean().default(true),
});
export type PrinterStationConfig = z.infer<typeof printerStationSchema>;

export const DEFAULT_PRINTER_STATIONS: PrinterStationConfig[] = [
  { id: 'cashier', name: 'Kasir Depan', type: 'BROWSER', brand: 'Generic Bluetooth / USB', isActive: true },
  { id: 'kitchen', name: 'Dapur (Kitchen)', type: 'NETWORK_LAN', host: '192.168.1.200', port: 9100, brand: 'Silicon LAN', isActive: true },
  { id: 'bar', name: 'Bar & Minuman', type: 'BLUETOOTH', brand: 'Bluetooth Depan', isActive: true },
];

export const outletSettingsUpdateSchema = z
  .object({
    qrisEnabled: z.boolean(),
    serviceMode: z.enum(SERVICE_MODES),
    stockReminderHours: z.array(z.number().int().min(0).max(23)).max(12),
    telegramBotToken: z.string().trim().max(200).nullable(),
    telegramChatId: z.string().trim().max(64).nullable(),
    whatsappWebhookUrl: z.string().trim().max(500).nullable(),
    printerStations: z.array(printerStationSchema).max(10),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Tidak ada pengaturan yang diubah');
export type OutletSettingsUpdateInput = z.infer<typeof outletSettingsUpdateSchema>;

export interface OutletSettingsDto {
  id: string;
  slug: string;
  name: string;
  qrisEnabled: boolean;
  serviceMode: ServiceMode;
  stockReminderHours: number[];
  telegramBotTokenConfigured: boolean;
  telegramBotTokenMasked: string | null;
  telegramChatId: string | null;
  whatsappWebhookUrl: string | null;
  printerStations: PrinterStationConfig[];
}

export interface SplitPrintTicket {
  stationId: string;
  stationName: string;
  type: PrinterStationType;
  host?: string | null;
  port?: number | null;
  orderCode: string;
  table: string;
  customerName: string;
  createdAt: string;
  paymentMethod: 'QRIS' | 'CASHIER';
  paymentStatus: string;
  serviceMode: ServiceMode;
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    note: string | null;
    categoryName: string;
  }>;
  plainText: string;
}

export interface PrintStationResult {
  stationId: string;
  stationName: string;
  type: PrinterStationType;
  success: boolean;
  message: string;
}
