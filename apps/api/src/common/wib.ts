/** WIB = UTC+7, tanpa daylight saving. Waktu disimpan UTC, tanggal bisnis memakai WIB. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal WIB `YYYY-MM-DD` dari sebuah waktu. */
export function wibDate(at: Date): string {
  return new Date(at.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Rentang UTC `[gte, lt)` yang mencakup hari WIB `from` sampai `to` (inklusif). */
export function wibDayRange(from: string, to: string): { gte: Date; lt: Date } {
  const start = (date: string) => new Date(`${date}T00:00:00Z`).getTime() - WIB_OFFSET_MS;
  return { gte: new Date(start(from)), lt: new Date(start(to) + DAY_MS) };
}
