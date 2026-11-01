import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ErrorCode } from 'shared';
import type { CategoryDto, MenuItemDto } from 'shared';
import AdminMenuPage from '@/app/admin/menu/page';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/admin/menu' }));
vi.mock('@/lib/staff-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/staff-api')>()),
  staffFetch: vi.fn(),
}));
const fetchMock = vi.mocked(staffFetch);

const CAT_TUNA = '00000000-0000-4000-8000-0000000000a1';
const CAT_MINUM = '00000000-0000-4000-8000-0000000000a2';
const ADMIN = { id: 'u1', outletId: 'o1', name: 'Owner', email: 'admin@matwona.local', role: 'ADMIN' };
const categories: CategoryDto[] = [
  { id: CAT_TUNA, name: 'Olahan Tuna', sortOrder: 0, isActive: true, itemCount: 2 },
  { id: CAT_MINUM, name: 'Minuman', sortOrder: 1, isActive: true, itemCount: 0 },
];
const menuItem = (id: string, overrides: Partial<MenuItemDto> = {}): MenuItemDto => ({
  id,
  categoryId: CAT_TUNA,
  name: `Menu ${id}`,
  description: null,
  price: 45000,
  imageUrl: null,
  stock: null,
  sku: null,
  isAvailable: true,
  isArchived: false,
  sortOrder: 0,
  olseraProductId: null,
  lastSyncedAt: null,
  ...overrides,
});
let items: MenuItemDto[];
let user: typeof ADMIN | { role: string } & typeof ADMIN;
let handler: (path: string, init?: RequestInit) => unknown;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminMenuPage />
    </QueryClientProvider>,
  );
}
const body = (call: number) => JSON.parse(fetchMock.mock.calls[call]![1]!.body as string);
const callTo = (path: string) => fetchMock.mock.calls.findIndex((c) => c[0] === path);
/** Baris tabel menu (desain A2) bernama sesuai nama menu. */
const row = (name: string) => screen.findByRole('row', { name });
const openCategories = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Kelola Kategori' }));
  return screen.getByRole('dialog', { name: 'Kelola kategori' });
};

beforeEach(() => {
  user = ADMIN;
  items = [
    menuItem('1', { name: 'Tuna Sambal Matah', stock: 10, sku: 'TN-SMT', olseraProductId: 'OLS-1' }),
    menuItem('2', { name: 'Tuna Geprek', price: 38000, isAvailable: false }),
  ];
  handler = () => undefined;
  fetchMock.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
    const custom = handler(path, init);
    if (custom !== undefined) return custom;
    if (path === '/auth/me') return user;
    if (path === '/categories') return categories;
    if (path === '/menu-items?archived=false') return items;
    if (path === '/menu-items?archived=true') return [menuItem('9', { name: 'Tuna Lama', isArchived: true })];
    return {};
  });
});

describe('Admin kelola menu (FR-010)', () => {
  it('kasir tidak bisa membuka halaman admin', async () => {
    user = { ...ADMIN, role: 'CASHIER' };
    renderPage();
    expect(await screen.findByText('Halaman ini khusus admin/owner.')).toBeTruthy();
  });

  it('tabel menu: harga, stok, SKU, Habis, ikon Olsera; panel kategori dengan jumlah menu', async () => {
    renderPage();
    const tuna = await row('Tuna Sambal Matah');
    expect(within(tuna).getByText('Rp 45.000')).toBeTruthy();
    expect(within(tuna).getByText('10')).toBeTruthy();
    expect(within(tuna).getByText('TN-SMT')).toBeTruthy();
    expect(within(tuna).getByText('Tersinkron Olsera')).toBeTruthy();
    expect(within(tuna).getByText('Olahan Tuna')).toBeTruthy();
    const geprek = screen.getByRole('row', { name: 'Tuna Geprek' });
    expect(within(geprek).getByText('Habis')).toBeTruthy();
    // Panel kategori = filter; tiap kategori menampilkan jumlah menu.
    const filter = screen.getByRole('button', { name: 'Olahan Tuna, 2 menu' });
    expect(filter.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kelola Menu');
  });

  it('filter kategori & cari nama/SKU', async () => {
    renderPage();
    await row('Tuna Sambal Matah');
    fireEvent.click(screen.getByRole('button', { name: 'Minuman, 0 menu' }));
    expect(screen.getByText('Belum ada menu di kategori ini.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Semua kategori' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari menu' }), { target: { value: 'tn-smt' } });
    expect(screen.getByRole('row', { name: 'Tuna Sambal Matah' })).toBeTruthy();
    expect(screen.queryByRole('row', { name: 'Tuna Geprek' })).toBeNull();
  });

  it('toggle Tersedia/Habis sekali klik → PATCH availability', async () => {
    renderPage();
    const toggle = await screen.findByRole('switch', { name: 'Tersedia: Tuna Sambal Matah' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(callTo('/menu-items/1/availability')).toBeGreaterThan(-1));
    expect(body(callTo('/menu-items/1/availability'))).toEqual({ isAvailable: false });
    expect(await screen.findByText('Tuna Sambal Matah ditandai Habis.')).toBeTruthy();
  });

  it('tambah menu: validasi lalu POST dengan harga integer Rupiah', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Tambah menu' });
    fireEvent.change(within(sheet).getByLabelText('Harga (Rupiah)'), { target: { value: '12000,5' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    expect(within(sheet).getByText('Nama menu wajib diisi')).toBeTruthy();
    expect(within(sheet).getByText('Isi dengan angka bulat')).toBeTruthy();
    expect(callTo('/menu-items')).toBe(-1);

    fireEvent.change(within(sheet).getByLabelText('Kategori'), { target: { value: CAT_MINUM } });
    fireEvent.change(within(sheet).getByLabelText('Nama menu'), { target: { value: 'Es Kelapa' } });
    fireEvent.change(within(sheet).getByLabelText('Harga (Rupiah)'), { target: { value: '12.000' } });
    fireEvent.change(within(sheet).getByLabelText('Stok'), { target: { value: '20' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(callTo('/menu-items')).toBeGreaterThan(-1));
    expect(body(callTo('/menu-items'))).toMatchObject({ categoryId: CAT_MINUM, name: 'Es Kelapa', price: 12000, stock: 20 });
    expect(await screen.findByText('Es Kelapa ditambahkan.')).toBeTruthy();
  });

  it('ubah menu Olsera: peringatan muncul, hanya field berubah yang dikirim (PUT)', async () => {
    renderPage();
    const tuna = await row('Tuna Sambal Matah');
    fireEvent.click(within(tuna).getByRole('button', { name: 'Ubah Tuna Sambal Matah' }));
    const sheet = screen.getByRole('dialog', { name: 'Ubah Tuna Sambal Matah' });
    expect(within(sheet).getByText(/tersinkron dari Olsera/)).toBeTruthy();

    fireEvent.change(within(sheet).getByLabelText('Harga (Rupiah)'), { target: { value: '47000' } });
    expect(within(sheet).getByRole('alert').textContent).toContain('harga menu ini bersumber dari Olsera dan bisa tertimpa');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(callTo('/menu-items/1')).toBeGreaterThan(-1));
    expect(fetchMock.mock.calls[callTo('/menu-items/1')]![1]!.method).toBe('PUT');
    expect(body(callTo('/menu-items/1'))).toEqual({ price: 47000 });
  });

  it('SKU dipakai menu lain → error di field SKU', async () => {
    handler = (path) => {
      if (path === '/menu-items/2') throw new ApiClientError(409, { code: ErrorCode.SKU_TAKEN, message: 'SKU TN-SMT sudah dipakai menu lain.' });
      return undefined;
    };
    renderPage();
    const geprek = await row('Tuna Geprek');
    fireEvent.click(within(geprek).getByRole('button', { name: 'Ubah Tuna Geprek' }));
    const sheet = screen.getByRole('dialog');
    fireEvent.change(within(sheet).getByLabelText('SKU'), { target: { value: 'TN-SMT' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    expect(await within(sheet).findByText('SKU TN-SMT sudah dipakai menu lain.')).toBeTruthy();
    expect(within(sheet).getByLabelText('SKU').getAttribute('aria-invalid')).toBe('true');
  });

  it('arsipkan dengan konfirmasi → DELETE (tidak dihapus permanen)', async () => {
    renderPage();
    const geprek = await row('Tuna Geprek');
    fireEvent.click(within(geprek).getByRole('button', { name: 'Arsipkan Tuna Geprek' }));
    const sheet = screen.getByRole('dialog', { name: 'Arsipkan Tuna Geprek?' });
    expect(within(sheet).getByText(/tidak dihapus permanen/)).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Arsipkan' }));
    await waitFor(() => expect(callTo('/menu-items/2')).toBeGreaterThan(-1));
    expect(fetchMock.mock.calls[callTo('/menu-items/2')]![1]!.method).toBe('DELETE');
  });

  it('hapus kategori berisi → pesan CATEGORY_NOT_EMPTY dari server', async () => {
    handler = (path, init) => {
      if (path === `/categories/${CAT_TUNA}` && init?.method === 'DELETE') {
        throw new ApiClientError(409, { code: ErrorCode.CATEGORY_NOT_EMPTY, message: 'Kategori masih berisi 2 menu.' });
      }
      return undefined;
    };
    renderPage();
    const manager = await openCategories();
    expect(within(manager).getByText('2 menu')).toBeTruthy();
    fireEvent.click(within(manager).getAllByRole('button', { name: 'Hapus' })[0]!);
    const sheet = screen.getByRole('dialog', { name: 'Hapus kategori Olahan Tuna?' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Hapus' }));
    expect((await within(sheet).findByRole('alert')).textContent).toBe('Kategori masih berisi 2 menu.');
  });

  it('urutkan kategori → PATCH reorder dengan seluruh id', async () => {
    renderPage();
    await openCategories();
    fireEvent.click(screen.getByRole('button', { name: 'Turunkan Olahan Tuna' }));
    await waitFor(() => expect(callTo('/categories/reorder')).toBeGreaterThan(-1));
    expect(body(callTo('/categories/reorder'))).toEqual({ ids: [CAT_MINUM, CAT_TUNA] });
    expect((screen.getByRole('button', { name: 'Naikkan Olahan Tuna' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('tambah kategori → POST', async () => {
    renderPage();
    const manager = await openCategories();
    fireEvent.click(within(manager).getByRole('button', { name: '+ Kategori' }));
    const sheet = screen.getByRole('dialog', { name: 'Tambah kategori' });
    fireEvent.change(within(sheet).getByLabelText('Nama kategori'), { target: { value: 'Paket Hemat' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(callTo('/categories')).toBeGreaterThan(-1));
    const post = fetchMock.mock.calls.find((c) => c[0] === '/categories' && c[1]?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({ name: 'Paket Hemat', isActive: true, sortOrder: 0 });
  });

  it('lihat arsip: menu diarsipkan tampil tanpa tombol aksi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Diarsipkan' }));
    expect(screen.getByRole('button', { name: 'Diarsipkan' }).getAttribute('aria-pressed')).toBe('true');
    const old = await row('Tuna Lama');
    expect(within(old).getByText('Diarsipkan')).toBeTruthy();
    expect(within(old).queryByRole('button')).toBeNull();
  });
});

describe('Foto menu (FR-010, S2-11)', () => {
  const png = (size = 1000) => new File([new Uint8Array(size)], 'tuna.png', { type: 'image/png' });
  const uploadUrl = 'https://res.cloudinary.com/demo/image/upload/v1/matwona/menu/1.png';

  async function openEdit() {
    renderPage();
    const tuna = await row('Tuna Sambal Matah');
    fireEvent.click(within(tuna).getByRole('button', { name: 'Ubah Tuna Sambal Matah' }));
    return screen.getByRole('dialog', { name: 'Ubah Tuna Sambal Matah' });
  }

  it('pilih foto → POST multipart langsung, pratinjau tampil, bisa diganti/dihapus', async () => {
    handler = (path, init) => {
      if (path === '/menu-items/1/image' && init?.method === 'POST') return { ...items[0], imageUrl: uploadUrl };
      if (path === '/menu-items/1/image' && init?.method === 'DELETE') return { ...items[0], imageUrl: null };
      return undefined;
    };
    const sheet = await openEdit();
    const file = png();
    fireEvent.change(within(sheet).getByLabelText('Unggah foto menu'), { target: { files: [file] } });

    await waitFor(() => expect(callTo('/menu-items/1/image')).toBeGreaterThan(-1));
    const init = fetchMock.mock.calls[callTo('/menu-items/1/image')]![1]!;
    expect(init.method).toBe('POST');
    expect((init.body as FormData).get('file')).toBe(file);
    expect((await within(sheet).findByRole('img', { name: 'Tuna Sambal Matah' })).getAttribute('src')).toContain('matwona/menu/1.png');
    expect(within(sheet).getByLabelText('Ganti foto menu')).toBeTruthy();

    fireEvent.click(within(sheet).getByRole('button', { name: 'Hapus foto' }));
    expect(await within(sheet).findByText('Unggah foto (pratinjau 4:3)')).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => c[0] === '/menu-items/1/image' && c[1]?.method === 'DELETE')).toBe(true);
  });

  it('format salah atau > 2 MB ditolak di browser tanpa memanggil API', async () => {
    const sheet = await openEdit();
    const input = within(sheet).getByLabelText('Unggah foto menu');
    fireEvent.change(input, { target: { files: [new File(['GIF89a'], 'anim.gif', { type: 'image/gif' })] } });
    expect(within(sheet).getByRole('alert').textContent).toBe('Format foto harus JPG, PNG, atau WebP.');
    fireEvent.change(input, { target: { files: [png(2 * 1024 * 1024 + 1)] } });
    expect(within(sheet).getByRole('alert').textContent).toBe('Ukuran foto maksimal 2 MB.');
    expect(callTo('/menu-items/1/image')).toBe(-1);
  });

  it('pesan error server (mis. Cloudinary gagal) ditampilkan', async () => {
    handler = (path) => {
      if (path === '/menu-items/1/image') {
        throw new ApiClientError(502, { code: ErrorCode.IMAGE_UPLOAD_FAILED, message: 'Foto belum bisa diunggah. Coba lagi beberapa saat lagi.' });
      }
      return undefined;
    };
    const sheet = await openEdit();
    fireEvent.change(within(sheet).getByLabelText('Unggah foto menu'), { target: { files: [png()] } });
    expect((await within(sheet).findByRole('alert')).textContent).toBe('Foto belum bisa diunggah. Coba lagi beberapa saat lagi.');
  });

  it('menu baru: foto diunggah setelah disimpan', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Tambah menu' });
    expect(within(sheet).getByText('Foto bisa diunggah setelah menu disimpan.')).toBeTruthy();
    expect(within(sheet).queryByLabelText('Unggah foto menu')).toBeNull();
  });
});
