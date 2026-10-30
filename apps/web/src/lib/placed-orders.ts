// Pesanan yang dibuat dari perangkat ini (FR-007). Token meja diperlukan untuk membuka status pesanan
// (GET /public/orders/:code + X-Table-Token), dan menu menampilkan banner "Lihat pesanan aktif".

const STORAGE_KEY = 'matwona-orders';
const MAX_ORDERS = 10;
/** Pesanan dianggap masih aktif untuk banner selama 12 jam. */
export const ACTIVE_ORDER_TTL_MS = 12 * 60 * 60 * 1000;

export interface PlacedOrder {
  code: string;
  outlet: string;
  tableToken: string;
  createdAt: string;
  /** true setelah pesanan selesai/dibatalkan → banner disembunyikan. */
  done?: boolean;
}

/** Isi mentah localStorage (string stabil untuk useSyncExternalStore). */
export function readPlacedOrdersRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parsePlacedOrders(raw: string | null): PlacedOrder[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PlacedOrder[]) : [];
  } catch {
    return [];
  }
}

/** Berlangganan perubahan dari tab lain (event `storage`). */
export function subscribePlacedOrders(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

const readAll = () => parsePlacedOrders(readPlacedOrdersRaw());

function writeAll(orders: PlacedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ORDERS)));
  } catch {
    // Storage penuh/diblokir (mode privat): status tetap bisa dibuka selama tab belum ditutup.
  }
}

export function rememberOrder(order: PlacedOrder) {
  writeAll([order, ...readAll().filter((o) => o.code !== order.code)]);
}

export function findPlacedOrder(code: string): PlacedOrder | undefined {
  return readAll().find((o) => o.code === code);
}

export function markOrderDone(code: string) {
  writeAll(readAll().map((o) => (o.code === code ? { ...o, done: true } : o)));
}

/** Pesanan terbaru meja ini yang belum selesai dan dibuat < 12 jam lalu. */
export function activeOrderForTable(tableToken: string, now = Date.now()): PlacedOrder | undefined {
  return readAll().find(
    (o) => o.tableToken === tableToken && !o.done && now - Date.parse(o.createdAt) < ACTIVE_ORDER_TTL_MS,
  );
}
