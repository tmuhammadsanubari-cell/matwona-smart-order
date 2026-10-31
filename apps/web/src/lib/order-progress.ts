import type { PublicOrderDto } from 'shared';

export type StepState = 'done' | 'current' | 'todo';

export interface OrderProgress {
  /** Kalimat utama untuk pelanggan (nada santai, BRAND.md). */
  headline: string;
  /** Kalimat pendukung di bawah headline (desain C6), mis. "Dapur lagi memasak. Duduk santai, ya!". */
  subline: string;
  /** Kosong untuk pesanan yang dibatalkan. */
  steps: { label: string; state: StepState }[];
  /** Pesanan selesai/dibatalkan: tidak akan berubah lagi. */
  final: boolean;
}

const STEP_ORDER = ['NEW', 'CONFIRMED', 'PREPARING', 'SERVED'] as const;

/**
 * Progres status pesanan pelanggan (FR-007, PRD 2.2.4):
 * Menunggu Pembayaran / Menunggu kasir → Diterima Kasir → Sedang Disiapkan → Disajikan.
 */
export function orderProgress(order: Pick<PublicOrderDto, 'status' | 'paymentMethod' | 'paymentStatus'>): OrderProgress {
  if (order.status === 'CANCELLED') {
    return {
      headline: 'Pesanan dibatalkan. Silakan hubungi kasir bila ada pertanyaan.',
      subline: 'Pembayaran yang sudah masuk akan diurus kasir.',
      steps: [],
      final: true,
    };
  }

  const awaitingQris = order.paymentMethod === 'QRIS' && order.paymentStatus !== 'PAID';
  const labels = [awaitingQris ? 'Menunggu pembayaran' : 'Menunggu kasir', 'Diterima kasir', 'Sedang disiapkan', 'Disajikan'];
  const currentIndex = order.status === 'COMPLETED' ? STEP_ORDER.length : STEP_ORDER.indexOf(order.status);
  const steps = labels.map((label, i) => ({
    label,
    state: (i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo') as StepState,
  }));

  const headlines: Record<string, string> = {
    NEW: awaitingQris
      ? 'Selesaikan pembayaran QRIS agar pesananmu diproses.'
      : 'Pesananmu sudah masuk. Tunggu konfirmasi kasir ya.',
    CONFIRMED: 'Pesananmu sudah diterima kasir 🙌',
    PREPARING: 'Pesananmu sedang disiapkan 🍳',
    SERVED: 'Pesananmu sudah disajikan. Selamat makan!',
    COMPLETED: 'Pesanan selesai. Terima kasih sudah makan di Matwona!',
  };

  const sublines: Record<string, string> = {
    NEW: awaitingQris ? 'Pesanan diteruskan ke kasir setelah pembayaran diterima.' : 'Kasir akan mengecek pesananmu sebentar lagi.',
    CONFIRMED: 'Sebentar lagi dapur mulai memasak.',
    PREPARING: 'Dapur lagi memasak. Duduk santai, ya!',
    SERVED: 'Semoga cocok di lidah. Selamat menikmati!',
    COMPLETED: 'Sampai jumpa lagi di Matwona.',
  };

  return {
    headline: headlines[order.status]!,
    subline: sublines[order.status]!,
    steps,
    final: order.status === 'COMPLETED',
  };
}
