import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ErrorCode, type PosSyncLogDto, type PosSyncPreviewDto } from 'shared';
import AdminSyncPage from '@/app/admin/sync/page';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { downloadStaffFile } from '@/lib/staff-download';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/admin/sync' }));
vi.mock('@/lib/staff-api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/staff-api')>()), staffFetch: vi.fn() }));
vi.mock('@/lib/staff-download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/staff-download')>()),
  downloadStaffFile: vi.fn(),
}));
const fetchMock = vi.mocked(staffFetch);

const ADMIN = { id: 'u1', outletId: 'o1', name: 'Owner', email: 'admin@matwona.local', role: 'ADMIN' };
const SAVED_MAPPING = { 'kode produk': 'externalId', 'nama produk': 'name', 'harga jual': 'price', kategori: 'categoryName' };
const CSV = 'Kode Produk,Nama Produk,Kategori,Harga Jual,Catatan\nOLS-1,Tuna Sambal Matah,Olahan Tuna,"Rp 45.000",pedas\n';
const PREVIEW: PosSyncPreviewDto = {
  logId: 'log-1',
  fileName: 'produk.csv',
  summary: { newCount: 1, changedCount: 1, unchangedCount: 0, errorCount: 1 },
  diff: [
    { name: 'Tuna Sambal Matah', categoryName: 'Olahan Tuna', status: 'changed', oldPrice: 40000, newPrice: 45000 },
    { name: 'Es Teh Manis', status: 'new', newPrice: 5000 },
  ],
  errors: [{ row: 4, reason: 'Harga kosong atau tidak valid' }],
};
const LOG: PosSyncLogDto = {
  id: 'l1',
  createdAt: '2026-11-24T02:30:00.000Z',
  direction: 'Tarik',
  entity: 'Produk',
  status: 'PARTIAL',
  successCount: 6,
  failedCount: 1,
  fileName: 'produk.csv',
  userName: 'Owner',
};

let handler: (path: string, init?: RequestInit) => unknown;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminSyncPage />
    </QueryClientProvider>,
  );
}

const call = (path: string, method?: string) =>
  fetchMock.mock.calls.find((c) => c[0] === path && (!method || c[1]?.method === method));

async function uploadCsv(content = CSV, name = 'produk.csv') {
  await waitFor(() => expect(call('/pos-sync/mapping?entity=PRODUCT')).toBeTruthy());
  const input = (await screen.findByText('Pilih file export produk Olsera (.csv)')).closest('label')!.querySelector('input')!;
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'text/csv' })] } });
}

const select = (header: string) => screen.getByLabelText(`Field untuk kolom ${header}`) as HTMLSelectElement;

beforeEach(() => {
  vi.mocked(downloadStaffFile).mockReset().mockResolvedValue('matwona_transaksi.csv');
  handler = () => undefined;
  fetchMock.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
    const custom = handler(path, init);
    if (custom !== undefined) return custom;
    if (path === '/auth/me') return ADMIN;
    if (path === '/pos-sync/mapping?entity=PRODUCT') return SAVED_MAPPING;
    if (path === '/pos-sync/mapping') return JSON.parse(init!.body as string).mapping;
    if (path === '/pos-sync/preview') return PREVIEW;
    if (path === '/pos-sync/apply') return { applied: 2 };
    if (path === '/pos-sync/history') return [LOG];
    return undefined;
  });
});

describe('Admin sinkronisasi Olsera (FR-013, FR-014, S2-10)', () => {
  it('tanpa file: tidak ada pemetaan, pratinjau, atau data contoh', async () => {
    renderPage();
    expect(await screen.findByText('Pilih file export produk Olsera (.csv)')).toBeTruthy();
    expect(screen.queryByText('2 · Pemetaan Kolom')).toBeNull();
    expect(screen.queryByText('3 · Pratinjau Perubahan')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Terapkan ke Menu' })).toBeNull();
  });

  it('unggah CSV → kolom file terisi otomatis dari pemetaan tersimpan', async () => {
    renderPage();
    await uploadCsv();
    expect(await screen.findByText('2 · Pemetaan Kolom')).toBeTruthy();
    expect(select('Kode Produk').value).toBe('externalId');
    expect(select('Nama Produk').value).toBe('name');
    expect(select('Kategori').value).toBe('categoryName');
    expect(select('Harga Jual').value).toBe('price');
    expect(select('Catatan').value).toBe('');
    expect(screen.getByText('5 kolom · 0.1 KB')).toBeTruthy();
  });

  it('ubah pemetaan + simpan → PUT mapping tervalidasi, lalu pratinjau memakai mapping yang sama', async () => {
    renderPage();
    await uploadCsv();
    fireEvent.change(await screen.findByLabelText('Field untuk kolom Catatan'), { target: { value: 'sku' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Pratinjau' }));

    await waitFor(() => expect(call('/pos-sync/preview', 'POST')).toBeTruthy());
    const saved = JSON.parse(call('/pos-sync/mapping', 'PUT')![1]!.body as string);
    expect(saved).toEqual({
      entity: 'PRODUCT',
      mapping: { 'Kode Produk': 'externalId', 'Nama Produk': 'name', Kategori: 'categoryName', 'Harga Jual': 'price', Catatan: 'sku' },
    });
    const form = call('/pos-sync/preview', 'POST')![1]!.body as FormData;
    expect(JSON.parse(form.get('columnMapping') as string)).toEqual(saved.mapping);
    expect((form.get('file') as File).name).toBe('produk.csv');
  });

  it('tanpa centang simpan → tidak memanggil PUT mapping', async () => {
    renderPage();
    await uploadCsv();
    fireEvent.click(await screen.findByLabelText('Simpan pemetaan ini untuk impor berikutnya'));
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Pratinjau' }));
    await waitFor(() => expect(call('/pos-sync/preview', 'POST')).toBeTruthy());
    expect(call('/pos-sync/mapping', 'PUT')).toBeUndefined();
  });

  it('field wajib belum dipetakan atau dipakai dua kolom → pratinjau dikunci', async () => {
    renderPage();
    await uploadCsv();
    fireEvent.change(await screen.findByLabelText('Field untuk kolom Harga Jual'), { target: { value: '' } });
    expect(screen.getByText('Pilih kolom untuk field "Harga".')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Lihat Pratinjau' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(select('Harga Jual'), { target: { value: 'price' } });
    fireEvent.change(select('Catatan'), { target: { value: 'name' } });
    expect(screen.getByText('Field "Nama" dipakai lebih dari satu kolom: Nama Produk, Catatan.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Lihat Pratinjau' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('pratinjau: jumlah baru/berubah/tetap/error + nomor baris error, lalu Terapkan → POST { logId }', async () => {
    renderPage();
    await uploadCsv();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat Pratinjau' }));

    const section = (await screen.findByText('3 · Pratinjau Perubahan')).closest('section')!;
    const stat = (label: string) => within(section).getByText(label, { selector: 'dt' }).nextSibling?.textContent;
    expect(stat('Produk baru')).toBe('1');
    expect(stat('Berubah')).toBe('1');
    expect(stat('Tidak berubah')).toBe('0');
    expect(stat('Baris error')).toBe('1');
    expect(within(section).getByText('Baris 4:')).toBeTruthy();
    expect(within(section).getByText(/Harga kosong atau tidak valid/)).toBeTruthy();
    expect(within(section).getByText('Tuna Sambal Matah')).toBeTruthy();

    fireEvent.click(within(section).getByRole('button', { name: 'Terapkan ke Menu' }));
    await waitFor(() => expect(call('/pos-sync/apply', 'POST')).toBeTruthy());
    expect(JSON.parse(call('/pos-sync/apply', 'POST')![1]!.body as string)).toEqual({ logId: 'log-1' });
    expect(await screen.findByText('2 produk diterapkan ke menu Matwona.')).toBeTruthy();
    expect(screen.queryByText('3 · Pratinjau Perubahan')).toBeNull();
  });

  it('mengubah pemetaan setelah pratinjau → pratinjau lama dibuang', async () => {
    renderPage();
    await uploadCsv();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat Pratinjau' }));
    await screen.findByText('3 · Pratinjau Perubahan');
    fireEvent.change(select('Catatan'), { target: { value: 'sku' } });
    expect(screen.queryByText('3 · Pratinjau Perubahan')).toBeNull();
  });

  it('error API saat pratinjau ditampilkan, tanpa pratinjau palsu', async () => {
    handler = (path) => {
      if (path === '/pos-sync/preview') throw new ApiClientError(422, { code: ErrorCode.SYNC_FILE_INVALID, message: 'Format CSV tidak sesuai pemetaan.' });
      return undefined;
    };
    renderPage();
    await uploadCsv();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat Pratinjau' }));
    expect(await screen.findByText('Format CSV tidak sesuai pemetaan.')).toBeTruthy();
    expect(screen.queryByText('3 · Pratinjau Perubahan')).toBeNull();
  });

  it('file tanpa judul kolom → pesan error', async () => {
    renderPage();
    await uploadCsv('\n\n', 'kosong.csv');
    expect(await screen.findByText('File CSV kosong atau tidak punya baris judul kolom.')).toBeTruthy();
    expect(screen.queryByText('2 · Pemetaan Kolom')).toBeNull();
  });

  it('ekspor: unduh CSV transaksi lunas untuk rentang tanggal WIB', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Ekspor Transaksi' }));
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-11-24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unduh CSV Transaksi' }));

    await waitFor(() => expect(downloadStaffFile).toHaveBeenCalled());
    const [path, options] = vi.mocked(downloadStaffFile).mock.calls[0]!;
    const query = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith('/pos-sync/export-transactions?')).toBe(true);
    expect(query.get('from')).toBe('2026-11-01T00:00:00+07:00');
    expect(query.get('to')).toBe('2026-11-24T23:59:59.999+07:00');
    expect(options.fallbackName).toBe('matwona_transaksi_2026-11-01_2026-11-24.csv');
    expect(await screen.findByText('matwona_transaksi.csv diunduh.')).toBeTruthy();
  });

  it('ekspor: tanggal awal setelah tanggal akhir → tombol dikunci', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Ekspor Transaksi' }));
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-11-25' } });
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-11-24' } });
    expect(screen.getByText('Tanggal awal tidak boleh setelah tanggal akhir.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Unduh CSV Transaksi' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('riwayat sinkronisasi dari API (FR-014) dengan waktu WIB & status bahasa Indonesia', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Riwayat Sinkron' }));
    const row = (await screen.findByText('produk.csv')).closest('tr')!;
    expect(within(row).getByText('Sebagian')).toBeTruthy();
    expect(within(row).getByText('6 / 1')).toBeTruthy();
    expect(within(row).getByText(/24 Nov 2026.*09\.30 WIB/)).toBeTruthy();
  });

  it('riwayat kosong → keadaan kosong', async () => {
    handler = (path) => (path === '/pos-sync/history' ? [] : undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Riwayat Sinkron' }));
    expect(await screen.findByText('Belum ada riwayat sinkronisasi')).toBeTruthy();
  });
});
