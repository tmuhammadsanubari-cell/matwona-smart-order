import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BADGE_TONES } from './badge';

// NFR-014: teks normal wajib kontras ≥ 4,5:1 (WCAG AA). Nilai token dibaca langsung dari globals.css
// sehingga mengubah warna brand yang merusak kontras langsung menggagalkan test.
const css = readFileSync(path.resolve(import.meta.dirname, '../../app/globals.css'), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name!, hex!.toLowerCase()]),
);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(fg: string, bg: string) {
  const [a, b] = [luminance(tokens[fg]!), luminance(tokens[bg]!)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Pasangan [teks, latar] yang dipakai komponen & layout. */
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['ink', 'cream', 'teks body di latar halaman'],
  ['ink', 'surface', 'teks body di kartu'],
  ['muted', 'cream', 'teks sekunder di latar halaman'],
  ['muted', 'surface', 'teks sekunder / hint di kartu'],
  ['primary-foreground', 'primary', 'Button primary, header'],
  ['primary-foreground', 'primary-hover', 'Button primary saat hover'],
  ['cream', 'primary', 'teks cream di header hijau'],
  ['primary', 'surface', 'Button secondary/ghost, harga'],
  ['primary', 'primary-soft', 'Button secondary/ghost saat hover'],
  ['primary', 'cream', 'link di latar cream'],
  ['primary-foreground', 'danger', 'Button danger'],
  ['danger', 'surface', 'pesan error field'],
  ['muted', 'line', 'teks di Card muted (item Habis)'],
  ['danger', 'danger-soft', 'Badge "Habis" di dalam Card muted'],
];

// Turunkan pasangan dari kelas Badge agar tone baru otomatis ikut diuji.
for (const [tone, classes] of Object.entries(BADGE_TONES)) {
  const bg = classes.match(/(?:^|\s)bg-([a-z-]+)/)?.[1];
  const fg = classes.match(/(?:^|\s)text-([a-z-]+)/)?.[1];
  TEXT_PAIRS.push([fg!, bg!, `Badge ${tone}`]);
}

describe('kontras warna brand (NFR-014)', () => {
  it('semua token yang dipakai terdefinisi di globals.css', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(tokens, fg).toHaveProperty(fg);
      expect(tokens, bg).toHaveProperty(bg);
    }
  });

  it.each(TEXT_PAIRS)('%s di atas %s ≥ 4,5:1 (%s)', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('accent/success memang tidak lolos untuk teks kecil putih (dokumentasi aturan BRAND.md)', () => {
    expect(contrast('primary-foreground', 'accent')).toBeLessThan(4.5);
    expect(contrast('success', 'surface')).toBeLessThan(4.5);
  });
});
