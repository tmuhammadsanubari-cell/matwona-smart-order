/** Batas jumlah meja per tambah sekaligus (sama dengan `createTablesSchema` di shared). */
export const MAX_BULK_TABLES = 100;

const RANGE = /^(.*?)(\d+)\s*-\s*(.*?)(\d+)$/;

/**
 * Ubah input admin menjadi daftar label meja (FR-011). Dipisah koma/baris baru; rentang angka
 * diperluas: "1-3" → 1, 2, 3 dan "A1-A3" atau "A1-3" → A1, A2, A3. Duplikat dibuang, urutan dijaga.
 */
export function parseTableLabels(input: string): { labels: string[]; error?: string } {
  const labels: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const part = raw.trim().replace(/\s+/g, ' ');
    if (!part) continue;
    const range = part.match(RANGE);
    if (range) {
      const [, prefixA, from, prefixB, to] = range;
      if (prefixB && prefixB.trim() !== prefixA!.trim()) return { labels: [], error: `Rentang "${part}" harus berawalan sama.` };
      const start = Number(from);
      const end = Number(to);
      if (end < start) return { labels: [], error: `Rentang "${part}" terbalik.` };
      if (end - start + 1 > MAX_BULK_TABLES) return { labels: [], error: `Maksimal ${MAX_BULK_TABLES} meja sekali tambah.` };
      for (let n = start; n <= end; n++) labels.push(`${prefixA!.trim()}${n}`);
    } else {
      labels.push(part);
    }
  }
  const unique = [...new Set(labels)];
  if (unique.length === 0) return { labels: [], error: 'Label meja wajib diisi.' };
  if (unique.length > MAX_BULK_TABLES) return { labels: [], error: `Maksimal ${MAX_BULK_TABLES} meja sekali tambah.` };
  const tooLong = unique.find((l) => l.length > 20);
  if (tooLong) return { labels: [], error: `Label "${tooLong}" lebih dari 20 karakter.` };
  return { labels: unique };
}
