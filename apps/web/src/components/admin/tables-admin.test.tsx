import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ErrorCode } from 'shared';
import type { DiningTableDto } from 'shared';
import AdminTablesPage from '@/app/admin/tables/page';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { downloadTablesQr } from '@/lib/tables-qr-download';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/admin/tables' }));
vi.mock('@/lib/staff-api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/staff-api')>()), staffFetch: vi.fn() }));
vi.mock('@/lib/tables-qr-download', () => ({ downloadTablesQr: vi.fn() }));
const fetchMock = vi.mocked(staffFetch);

const ADMIN = { id: 'u1', outletId: 'o1', name: 'Owner', email: 'admin@matwona.local', role: 'ADMIN' };
const table = (id: string, label: string, overrides: Partial<DiningTableDto> = {}): DiningTableDto => ({
  id,
  label,
  capacity: 4,
  qrToken: `token${id}`.padEnd(22, '0'),
  isActive: true,
  ...overrides,
});
let handler: (path: string, init?: RequestInit) => unknown;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminTablesPage />
    </QueryClientProvider>,
  );
}
const call = (path: string, method?: string) =>
  fetchMock.mock.calls.find((c) => c[0] === path && (!method || c[1]?.method === method));
const bodyOf = (path: string, method?: string) => JSON.parse(call(path, method)![1]!.body as string);
/** Buka menu ⋯ kartu meja (desain A3) lalu kembalikan kartunya. */
const openOptions = async (label: string) => {
  const card = await screen.findByRole('article', { name: `Meja ${label}` });
  fireEvent.click(within(card).getByRole('button', { name: `Opsi Meja ${label}` }));
  return card;
};

beforeEach(() => {
  vi.mocked(downloadTablesQr).mockReset().mockResolvedValue();
  handler = () => undefined;
  fetchMock.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
    const custom = handler(path, init);
    if (custom !== undefined) return custom;
    if (path === '/auth/me') return ADMIN;
    if (path === '/tables' && !init) return [table('1', '1'), table('2', '2'), table('3', 'Teras', { isActive: false, capacity: null })];
    if (path === '/tables') return [table('9', 'Baru')];
    return table('1', '1');
  });
});

describe('Admin meja & QR (FR-011)', () => {
  it('daftar meja: kapasitas & status; meja nonaktif tidak bisa dipilih/diunduh', async () => {
    renderPage();
    const meja1 = await screen.findByRole('article', { name: 'Meja 1' });
    expect(within(meja1).getByText('4 kursi')).toBeTruthy();
    expect(within(meja1).getByText('Aktif')).toBeTruthy();
    expect(screen.getByText('3 meja · 2 aktif')).toBeTruthy();
    const teras = await openOptions('Teras');
    expect(within(teras).getByText('Nonaktif')).toBeTruthy();
    expect(within(teras).getByText('Kapasitas belum diisi')).toBeTruthy();
    expect((within(teras).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(within(teras).queryByRole('button', { name: 'Unduh QR' })).toBeNull();
    await openOptions('1');
    expect(within(meja1).getByRole('button', { name: 'Opsi Meja 1' }).getAttribute('aria-expanded')).toBe('true');
    expect(within(meja1).getByRole('link', { name: 'Buka menu' }).getAttribute('href')).toBe(`/m/matwona/t/${table('1', '1').qrToken}`);
  });

  it('tambah satu meja dengan kapasitas → POST { label, capacity }', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Meja' }));
    const sheet = screen.getByRole('dialog', { name: 'Tambah meja' });
    fireEvent.change(within(sheet).getByLabelText('Label meja'), { target: { value: 'VIP' } });
    fireEvent.change(within(sheet).getByLabelText('Kapasitas'), { target: { value: '6' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(call('/tables', 'POST')).toBeTruthy());
    expect(bodyOf('/tables', 'POST')).toEqual({ label: 'VIP', capacity: 6 });
  });

  it('tambah banyak sekaligus dengan rentang "A1-A3" → pratinjau & POST { labels }', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Meja' }));
    const sheet = screen.getByRole('dialog');
    fireEvent.change(within(sheet).getByLabelText('Label meja'), { target: { value: 'A1-A3' } });
    expect(within(sheet).getByText('Akan menambah 3 meja: A1, A2, A3')).toBeTruthy();
    expect(within(sheet).queryByLabelText('Kapasitas')).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tambah 3 meja' }));
    await waitFor(() => expect(call('/tables', 'POST')).toBeTruthy());
    expect(bodyOf('/tables', 'POST')).toEqual({ labels: ['A1', 'A2', 'A3'] });
  });

  it('label sudah dipakai → pesan TABLE_LABEL_TAKEN di field', async () => {
    handler = (path, init) => {
      if (path === '/tables' && init?.method === 'POST') throw new ApiClientError(409, { code: ErrorCode.TABLE_LABEL_TAKEN, message: 'Label meja sudah dipakai: 1.' });
      return undefined;
    };
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Meja' }));
    const sheet = screen.getByRole('dialog');
    fireEvent.change(within(sheet).getByLabelText('Label meja'), { target: { value: '1' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    expect(await within(sheet).findByText('Label meja sudah dipakai: 1.')).toBeTruthy();
  });

  it('nonaktifkan meja sekali klik → PUT { isActive: false }', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('switch', { name: 'Aktif: Meja 1' }));
    await waitFor(() => expect(call('/tables/1', 'PUT')).toBeTruthy());
    expect(bodyOf('/tables/1', 'PUT')).toEqual({ isActive: false });
    expect(await screen.findByText('Meja 1 dinonaktifkan.')).toBeTruthy();
  });

  it('ganti QR dengan konfirmasi → POST regenerate-token', async () => {
    renderPage();
    const meja2 = await openOptions('2');
    fireEvent.click(within(meja2).getByRole('button', { name: 'Ganti QR' }));
    const sheet = screen.getByRole('dialog', { name: 'Ganti QR Meja 2?' });
    expect(within(sheet).getByText(/langsung tidak bisa dipakai memesan/)).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ganti QR' }));
    await waitFor(() => expect(call('/tables/2/regenerate-token', 'POST')).toBeTruthy());
    expect(await screen.findByText(/QR lama tidak berlaku lagi/)).toBeTruthy();
  });

  it('unduh QR semua meja aktif, terpilih (A4), dan satu meja', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF QR' }));
    await waitFor(() => expect(downloadTablesQr).toHaveBeenCalledWith({ ids: undefined, layout: 'a6' }));

    fireEvent.change(screen.getByLabelText('Ukuran kertas'), { target: { value: 'a4grid' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Meja 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Meja 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unduh QR terpilih (2)' }));
    await waitFor(() => expect(downloadTablesQr).toHaveBeenLastCalledWith({ ids: ['1', '2'], layout: 'a4grid' }));

    fireEvent.click(within(await openOptions('1')).getByRole('button', { name: 'Unduh QR' }));
    await waitFor(() => expect(downloadTablesQr).toHaveBeenLastCalledWith({ ids: ['1'], layout: 'a4grid' }));
  });

  it('unduhan gagal → pesan error', async () => {
    vi.mocked(downloadTablesQr).mockRejectedValue(new ApiClientError(404, { code: ErrorCode.NOT_FOUND, message: 'Tidak ada meja aktif untuk dicetak.' }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF QR' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Tidak ada meja aktif untuk dicetak.');
  });

  it('sidebar admin: halaman aktif ditandai, halaman lain dapat diakses', async () => {
    renderPage();
    await screen.findByRole('article', { name: 'Meja 1' });
    const nav = screen.getByRole('navigation', { name: 'Navigasi admin' });
    expect(within(nav).getByRole('link', { name: 'Meja & QR' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Menu' }).getAttribute('aria-current')).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Analitik' })).toBeTruthy();
  });
});
