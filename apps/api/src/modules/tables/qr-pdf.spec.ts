import { tablesQrQuerySchema } from 'shared';
import { renderTablesQrPdf, tableQrUrl } from './qr-pdf.js';
import { publicWebUrl } from './tables.service.js';

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
const tables = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `A${i + 1}`, qrToken: `token${i}`.padEnd(22, '0') }));
const render = (n: number, layout: 'a6' | 'a4grid') =>
  renderTablesQrPdf({ outletName: 'Matwona', outletSlug: 'matwona', webBaseUrl: 'https://matwona.id', layout, tables: tables(n) });

describe('PDF QR meja (FR-011)', () => {
  it('URL QR = <web>/m/<outlet>/t/<token>, tanpa garis miring ganda', () => {
    expect(tableQrUrl('https://matwona.id/', 'matwona', 'Abc123')).toBe('https://matwona.id/m/matwona/t/Abc123');
    expect(tableQrUrl('http://192.168.137.1:3000', 'matwona', 'X')).toBe('http://192.168.137.1:3000/m/matwona/t/X');
  });

  it('layout A6: satu meja per halaman', async () => {
    const pdf = await render(3, 'a6');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(3);
  });

  it('layout grid A4: empat meja per halaman', async () => {
    expect(pageCount(await render(4, 'a4grid'))).toBe(1);
    expect(pageCount(await render(5, 'a4grid'))).toBe(2);
  });

  it('alamat web QR: PUBLIC_WEB_URL, lalu origin pertama WEB_ORIGIN, lalu localhost', () => {
    expect(publicWebUrl({ PUBLIC_WEB_URL: 'https://matwona.id', WEB_ORIGIN: 'http://x' } as NodeJS.ProcessEnv)).toBe('https://matwona.id');
    expect(publicWebUrl({ WEB_ORIGIN: 'https://app.matwona.id, http://localhost:3000' } as NodeJS.ProcessEnv)).toBe('https://app.matwona.id');
    expect(publicWebUrl({} as NodeJS.ProcessEnv)).toBe('http://localhost:3000');
  });

  it('query: ids dipisah koma & layout default A6', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(tablesQrQuerySchema.parse({})).toEqual({ ids: undefined, layout: 'a6' });
    expect(tablesQrQuerySchema.parse({ ids: `${id}, ${id}`, layout: 'a4grid' })).toEqual({ ids: [id, id], layout: 'a4grid' });
    expect(tablesQrQuerySchema.safeParse({ ids: 'bukan-uuid' }).success).toBe(false);
    expect(tablesQrQuerySchema.safeParse({ layout: 'a3' }).success).toBe(false);
  });
});
