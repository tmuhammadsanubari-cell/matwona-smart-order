import type { OrderStatus, StaffOrderDto } from 'shared';

export type ColumnId = 'new' | 'process' | 'served' | 'done';

/** Kolom dashboard kasir (PRD 2.2.5): Baru, Diproses, Disajikan, Selesai. */
export const COLUMNS: { id: ColumnId; title: string; statuses: OrderStatus[] }[] = [
  { id: 'new', title: 'Baru', statuses: ['NEW'] },
  { id: 'process', title: 'Diproses', statuses: ['CONFIRMED', 'PREPARING'] },
  { id: 'served', title: 'Disajikan', statuses: ['SERVED'] },
  { id: 'done', title: 'Selesai', statuses: ['COMPLETED', 'CANCELLED'] },
];

export const columnOf = (status: OrderStatus): ColumnId => COLUMNS.find((c) => c.statuses.includes(status))!.id;

/** Label tombol untuk status tujuan. Status yang sah tetap ditentukan server (`allowedNextStatuses`). */
export const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Terima pesanan',
  PREPARING: 'Mulai siapkan',
  SERVED: 'Tandai disajikan',
  COMPLETED: 'Selesaikan',
};

/** Aksi maju utama (bukan batal) dari daftar transisi yang diizinkan server, bila ada. */
export const primaryNextStatus = (order: Pick<StaffOrderDto, 'allowedNextStatuses'>): OrderStatus | undefined =>
  order.allowedNextStatuses.find((s) => s !== 'CANCELLED');

/** Kelompokkan pesanan per kolom; tiap kolom urut dari yang paling lama menunggu (FIFO). */
export function groupByColumn(orders: StaffOrderDto[]): Record<ColumnId, StaffOrderDto[]> {
  const groups: Record<ColumnId, StaffOrderDto[]> = { new: [], process: [], served: [], done: [] };
  for (const order of orders) groups[columnOf(order.status)].push(order);
  for (const id of ['new', 'process', 'served'] as const) {
    groups[id].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  groups.done.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return groups;
}

/** Sisipkan/ganti pesanan berdasarkan id (event realtime). */
export function upsertOrder(orders: StaffOrderDto[] | undefined, order: StaffOrderDto): StaffOrderDto[] {
  const list = orders ?? [];
  return list.some((o) => o.id === order.id) ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
}

const wibDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
const wibTimeFormat = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

/** Tanggal WIB `YYYY-MM-DD` (filter default "hari ini"). */
export const todayWib = (now = new Date()) => wibDateFormat.format(now);

/** Jam masuk pesanan dalam WIB, mis. "12.05". */
export const timeWib = (iso: string) => wibTimeFormat.format(new Date(iso));

/**
 * Samarkan no. HP pelanggan di dashboard kasir (NFR-011, desain K3): "081234567890" → "0812****7890".
 * Nomor pendek hanya menampilkan 2 digit awal.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(digits.length - 2, 3))}`;
}
