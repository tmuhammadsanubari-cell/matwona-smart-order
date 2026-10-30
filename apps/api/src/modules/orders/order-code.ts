/** WIB = UTC+7, tanpa daylight saving. */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_DAILY_SEQUENCE = 9999;

/** Prefix kode pesanan per hari WIB: `MTW-YYMMDD-`. */
export function orderCodePrefix(now: Date): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const yy = String(wib.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wib.getUTCDate()).padStart(2, '0');
  return `MTW-${yy}${mm}${dd}-`;
}

/**
 * Kode berikutnya setelah `lastCode` (kode terbesar hari itu, atau null).
 * Contoh: nextOrderCode('MTW-261105-', 'MTW-261105-0041') → 'MTW-261105-0042'.
 */
export function nextOrderCode(prefix: string, lastCode: string | null): string {
  const last = lastCode ? Number(lastCode.slice(prefix.length)) : 0;
  const next = Number.isInteger(last) ? last + 1 : 1;
  if (next > MAX_DAILY_SEQUENCE) {
    throw new Error(`Nomor urut pesanan harian habis untuk ${prefix}`);
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}
