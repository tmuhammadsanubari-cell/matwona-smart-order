import { ErrorCode } from 'shared';
import { refreshSession } from './staff-api';
import { parseTableLabels } from './table-labels';
import { downloadTablesQr } from './tables-qr-download';

vi.mock('./staff-api', () => ({ refreshSession: vi.fn() }));

describe('parseTableLabels (FR-011)', () => {
  it('satu label, daftar dipisah koma/baris, spasi dirapikan, duplikat dibuang', () => {
    expect(parseTableLabels(' Teras  1 ')).toEqual({ labels: ['Teras 1'] });
    expect(parseTableLabels('1, 2,\n3, 2')).toEqual({ labels: ['1', '2', '3'] });
  });

  it('rentang angka & berawalan: "1-3", "A1-A3", "A1-3"', () => {
    expect(parseTableLabels('1-3').labels).toEqual(['1', '2', '3']);
    expect(parseTableLabels('A1-A3').labels).toEqual(['A1', 'A2', 'A3']);
    expect(parseTableLabels('A1-3, VIP').labels).toEqual(['A1', 'A2', 'A3', 'VIP']);
  });

  it('error: kosong, rentang terbalik/beda awalan, > 100 meja, label > 20 karakter', () => {
    expect(parseTableLabels(' , ').error).toBe('Label meja wajib diisi.');
    expect(parseTableLabels('5-1').error).toContain('terbalik');
    expect(parseTableLabels('A1-B3').error).toContain('berawalan sama');
    expect(parseTableLabels('1-101').error).toContain('Maksimal 100');
    expect(parseTableLabels('x'.repeat(21)).error).toContain('lebih dari 20');
  });
});

describe('downloadTablesQr', () => {
  const fetchMock = vi.fn();
  const click = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    click.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:qr');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    vi.mocked(refreshSession).mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  // Body string, bukan Blob jsdom: Response Node 22 butuh Blob.stream() yang tidak dimiliki Blob jsdom.
  const pdf = () => new Response('%PDF-1.3', { status: 200, headers: { 'Content-Type': 'application/pdf' } });

  it('mengunduh file PDF dengan ids & layout', async () => {
    fetchMock.mockResolvedValue(pdf());
    await downloadTablesQr({ ids: ['a', 'b'], layout: 'a4grid' });
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/tables\/qr\.pdf\?layout=a4grid&ids=a%2Cb$/);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: 'include' });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('401 → refresh sesi lalu ulangi', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(pdf());
    vi.mocked(refreshSession).mockResolvedValue(true);
    await downloadTablesQr({ layout: 'a6' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalled();
  });

  it('error JSON dari server → ApiClientError dengan pesannya', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Tidak ada meja aktif untuk dicetak.' } }), {
        status: 404,
      }),
    );
    await expect(downloadTablesQr({ layout: 'a6' })).rejects.toMatchObject({ status: 404, message: 'Tidak ada meja aktif untuk dicetak.' });
    expect(click).not.toHaveBeenCalled();
  });
});
