import { Injectable, Logger } from '@nestjs/common';
import { formatRupiah } from 'shared';
import type { OrderWithItems } from '../orders/order.mapper.js';

export interface NotificationTarget {
  name: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  whatsappWebhookUrl: string | null;
}

export interface NotificationTestResult {
  telegram: { configured: boolean; sent: boolean; message: string };
  whatsapp: { configured: boolean; sent: boolean; message: string };
}

/**
 * Layanan notifikasi eksternal untuk owner & kasir (Telegram Bot & WhatsApp Webhook).
 * Dipanggil secara non-blocking agar alur pesanan tidak pernah gagal hanya karena gangguan jaringan.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  async sendOrderAlert(outlet: NotificationTarget, order: OrderWithItems): Promise<void> {
    if (!outlet.telegramBotToken && !outlet.whatsappWebhookUrl) return;

    const lines = order.items.map(
      (it) =>
        `• ${it.quantity}× ${it.itemNameSnapshot} (${formatRupiah(it.lineTotal)})` +
        (it.note ? `\n   📝 Catatan: ${it.note}` : ''),
    );

    const text = [
      `🛎️ *PESANAN BARU · ${outlet.name}*`,
      `Kode: \`${order.orderCode}\``,
      `Meja: *${order.table?.label ?? '-'}* · ${order.customerName}`,
      `Metode: ${order.paymentMethod === 'CASHIER' ? 'Bayar di Kasir' : 'QRIS'} (${order.paymentStatus})`,
      '',
      ...lines,
      '',
      `💰 *Total: ${formatRupiah(order.totalAmount)}*`,
    ].join('\n');

    await Promise.all([
      this.postTelegram(outlet.telegramBotToken, outlet.telegramChatId, text),
      this.postWhatsappWebhook(outlet.whatsappWebhookUrl, {
        event: 'order.created',
        outlet: outlet.name,
        orderCode: order.orderCode,
        table: order.table?.label ?? '',
        customerName: order.customerName,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        text: text.replaceAll('*', '').replaceAll('`', ''),
      }),
    ]);
  }

  async sendLowStockAlert(
    outlet: NotificationTarget,
    items: Array<{ name: string; stock: number | null }>,
  ): Promise<void> {
    if (!items.length || (!outlet.telegramBotToken && !outlet.whatsappWebhookUrl)) return;

    const itemLines = items.map((i) =>
      i.stock === 0 ? `• ❌ *${i.name}*: HABIS (0)` : `• ⚠️ *${i.name}*: sisa ${i.stock}`,
    );
    const text = [
      `📦 *PERINGATAN STOK MENU · ${outlet.name}*`,
      ...itemLines,
      'Segera cek ketersediaan di dapur/bar.',
    ].join('\n');

    await Promise.all([
      this.postTelegram(outlet.telegramBotToken, outlet.telegramChatId, text),
      this.postWhatsappWebhook(outlet.whatsappWebhookUrl, {
        event: 'stock.low',
        outlet: outlet.name,
        items,
        text: text.replaceAll('*', ''),
      }),
    ]);
  }

  async sendTestNotification(outlet: NotificationTarget): Promise<NotificationTestResult> {
    const sampleText = `✅ Tes notifikasi dari *Matwona Smart Order* (${outlet.name}) berhasil terhubung!`;

    let telegram: NotificationTestResult['telegram'];
    if (outlet.telegramBotToken && outlet.telegramChatId) {
      const ok = await this.postTelegram(outlet.telegramBotToken, outlet.telegramChatId, sampleText);
      telegram = ok
        ? { configured: true, sent: true, message: 'Pesan tes berhasil dikirim ke Telegram.' }
        : { configured: true, sent: false, message: 'Gagal mengirim ke Telegram. Periksa Bot Token & Chat ID.' };
    } else {
      telegram = { configured: false, sent: false, message: 'Bot Token / Chat ID Telegram belum diisi.' };
    }

    let whatsapp: NotificationTestResult['whatsapp'];
    if (outlet.whatsappWebhookUrl) {
      const ok = await this.postWhatsappWebhook(outlet.whatsappWebhookUrl, {
        event: 'test',
        outlet: outlet.name,
        text: sampleText.replaceAll('*', ''),
      });
      whatsapp = ok
        ? { configured: true, sent: true, message: 'Payload tes terkirim ke Webhook WhatsApp.' }
        : { configured: true, sent: false, message: 'Gagal menghubungi URL Webhook WhatsApp.' };
    } else {
      whatsapp = { configured: false, sent: false, message: 'URL Webhook WhatsApp belum diisi.' };
    }

    return { telegram, whatsapp };
  }

  private async postTelegram(botToken: string | null, chatId: string | null, text: string): Promise<boolean> {
    if (!botToken || !chatId) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        this.logger.warn(`Telegram HTTP ${res.status}: ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Gagal kirim notifikasi Telegram: ${(err as Error).message}`);
      return false;
    }
  }

  private async postWhatsappWebhook(url: string | null, payload: Record<string, unknown>): Promise<boolean> {
    if (!url) return false;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        this.logger.warn(`WhatsApp webhook HTTP ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Gagal kirim webhook WhatsApp: ${(err as Error).message}`);
      return false;
    }
  }
}
