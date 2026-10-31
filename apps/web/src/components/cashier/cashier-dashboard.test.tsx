import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ErrorCode, SocketEvent } from 'shared';
import type { StaffOrderDto } from 'shared';
import { ApiClientError } from '@/lib/api';
import { playNewOrderSound } from '@/lib/notification-sound';
import { connectRealtime } from '@/lib/socket';
import { staffFetch } from '@/lib/staff-api';
import { CashierDashboard } from './cashier-dashboard';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/cashier' }));
vi.mock('@/lib/staff-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/staff-api')>()),
  staffFetch: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock('@/lib/socket', () => ({ connectRealtime: vi.fn() }));
vi.mock('@/lib/notification-sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notification-sound')>()),
  playNewOrderSound: vi.fn(),
  unlockSound: vi.fn(),
}));
const fetchMock = vi.mocked(staffFetch);

function fakeSocket() {
  const handlers = new Map<string, (payload?: unknown) => void>();
  const socket = {
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    emitFromServer: (event: string, payload?: unknown) => act(() => handlers.get(event)?.(payload)),
  };
  return socket;
}

const USER = { id: 'u1', outletId: 'o1', name: 'Kasir 1', email: 'kasir@matwona.local', role: 'CASHIER' };
const order = (id: string, overrides: Partial<StaffOrderDto> = {}): StaffOrderDto => ({
  id,
  orderCode: `MTW-261105-000${id}`,
  table: '5',
  customerName: 'Rina',
  customerPhone: '081234567890',
  status: 'NEW',
  paymentMethod: 'CASHIER',
  paymentStatus: 'UNPAID',
  subtotalAmount: 98000,
  discountAmount: 0,
  totalAmount: 98000,
  items: [{ menuItemId: 't1', name: 'Tuna Sambal Matah', quantity: 2, unitPrice: 45000, discountAmount: 0, lineTotal: 90000, note: 'sambal dipisah' }],
  createdAt: '2026-11-05T05:12:44Z',
  updatedAt: '2026-11-05T05:12:44Z',
  cancelReason: null,
  paidAt: null,
  allowedNextStatuses: ['CONFIRMED', 'CANCELLED'],
  canMarkPaid: true,
  ...overrides,
});

let socket: ReturnType<typeof fakeSocket>;
let orders: StaffOrderDto[];

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CashierDashboard />
    </QueryClientProvider>,
  );
}

const column = (title: string) => screen.getByRole('region', { name: new RegExp(`^${title}`) });
const card = (code: string) => screen.getByRole('article', { name: `Pesanan ${code}` });

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  vi.mocked(playNewOrderSound).mockReset();
  socket = fakeSocket();
  vi.mocked(connectRealtime).mockReset().mockReturnValue(socket as never);
  orders = [order('1')];
  fetchMock.mockReset().mockImplementation(async (path: string) => {
    if (path === '/auth/me') return USER;
    if (path.startsWith('/orders?')) return orders;
    throw new Error(`unexpected ${path}`);
  });
});

describe('Dashboard kasir (FR-008)', () => {
  it('belum login → diarahkan ke /login?next=/cashier', async () => {
    fetchMock.mockImplementation(async () => {
      throw new ApiClientError(401, { code: ErrorCode.UNAUTHORIZED, message: 'x' });
    });
    renderDashboard();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fcashier'));
  });

  it('kolom Baru/Diproses/Disajikan/Selesai dan isi kartu lengkap', async () => {
    orders = [order('1'), order('2', { status: 'PREPARING', allowedNextStatuses: ['SERVED'], canMarkPaid: false, paymentStatus: 'PAID' })];
    renderDashboard();
    await screen.findByText('MTW-261105-0001');

    expect(within(column('Baru')).getByText('MTW-261105-0001')).toBeTruthy();
    expect(within(column('Diproses')).getByText('MTW-261105-0002')).toBeTruthy();
    expect(within(column('Disajikan')).getByText('Belum ada pesanan.')).toBeTruthy();

    const c = card('MTW-261105-0001');
    expect(within(c).getByText(/Masuk 12\.12/)).toBeTruthy();
    expect(within(c).getByText('Meja 5')).toBeTruthy();
    expect(within(c).getByText('Rina')).toBeTruthy();
    expect(within(c).getByText('2× Tuna Sambal Matah')).toBeTruthy();
    expect(within(c).getByText('Catatan: sambal dipisah')).toBeTruthy();
    expect(within(c).getByText('Rp 98.000')).toBeTruthy();
    expect(within(c).getByText('Belum bayar')).toBeTruthy();
    expect(within(c).getByText('Bayar di kasir')).toBeTruthy();
    // NFR-011: no. HP pelanggan disamarkan di dashboard.
    expect(within(c).getByText('0812****7890')).toBeTruthy();
    expect(within(c).queryByText(/081234567890/)).toBeNull();
    // Penghitung kolom & jumlah pesanan hari ini.
    expect(within(column('Baru')).getByLabelText('1 pesanan')).toBeTruthy();
    expect(screen.getByText('2 pesanan hari ini')).toBeTruthy();
  });

  it('pesanan baru via realtime masuk kolom Baru, disorot, dan berbunyi', async () => {
    orders = [];
    renderDashboard();
    await screen.findAllByText('Belum ada pesanan.');
    socket.emitFromServer(SocketEvent.ORDER_CREATED, order('7'));

    const c = await screen.findByRole('article', { name: 'Pesanan MTW-261105-0007' });
    expect(column('Baru').contains(c)).toBe(true);
    expect(c.className).toContain('ring-accent');
    expect(within(c).getByText('BARU')).toBeTruthy();
    expect(playNewOrderSound).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pesanan baru dari Meja 5')).toBeTruthy();
  });

  it('suara bisa dimatikan dan preferensi disimpan', async () => {
    orders = [];
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Suara notifikasi: Aktif' }));
    expect(screen.getByRole('button', { name: 'Suara notifikasi: Mati' }).getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem('matwona-cashier-sound')).toBe('off');
    socket.emitFromServer(SocketEvent.ORDER_CREATED, order('8'));
    await screen.findByText('MTW-261105-0008');
    expect(playNewOrderSound).not.toHaveBeenCalled();
  });

  it('Terima pesanan → PATCH status, kartu pindah ke Diproses', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return USER;
      if (path.startsWith('/orders?')) return orders;
      if (path === '/orders/1/status') return order('1', { status: 'CONFIRMED', allowedNextStatuses: ['PREPARING', 'CANCELLED'] });
      throw new Error(path);
    });
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Terima pesanan' }));

    await waitFor(() => expect(within(column('Diproses')).queryByText('MTW-261105-0001')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/orders/1/status', { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) });
    expect(screen.getByRole('button', { name: 'Mulai siapkan' })).toBeTruthy();
  });

  it('Tandai lunas → POST mark-paid, badge Lunas', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return USER;
      if (path.startsWith('/orders?')) return orders;
      if (path === '/orders/1/mark-paid') return order('1', { paymentStatus: 'PAID', canMarkPaid: false });
      throw new Error(path);
    });
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Tandai lunas' }));
    expect(await screen.findByText('Lunas')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tandai lunas' })).toBeNull();
  });

  it('Batalkan wajib alasan ≥ 5 karakter; berhasil → kolom Selesai dengan alasan', async () => {
    fetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/auth/me') return USER;
      if (path.startsWith('/orders?')) return orders;
      if (path === '/orders/1/cancel') {
        const { reason } = JSON.parse(init!.body as string);
        return order('1', { status: 'CANCELLED', cancelReason: reason, allowedNextStatuses: [], canMarkPaid: false });
      }
      throw new Error(path);
    });
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan' }));
    const sheet = screen.getByRole('dialog', { name: 'Batalkan pesanan MTW-261105-0001?' });
    expect(within(sheet).getByText('Stok item akan dikembalikan')).toBeTruthy();

    fireEvent.change(within(sheet).getByLabelText('Alasan pembatalan'), { target: { value: 'ga' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Batalkan Pesanan' }));
    expect(within(sheet).getByText('Alasan minimal 5 karakter')).toBeTruthy();

    fireEvent.change(within(sheet).getByLabelText('Alasan pembatalan'), { target: { value: 'Pelanggan batal pesan' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Batalkan Pesanan' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(column('Selesai')).getByText('Dibatalkan: Pelanggan batal pesan')).toBeTruthy();
  });

  it('aksi ditolak server → pesan error ditampilkan', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return USER;
      if (path.startsWith('/orders?')) return orders;
      throw new ApiClientError(409, { code: ErrorCode.INVALID_STATUS_TRANSITION, message: 'Pesanan baru saja diubah oleh pengguna lain.' });
    });
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Terima pesanan' }));
    expect((await screen.findByRole('alert')).textContent).toContain('diubah oleh pengguna lain');
  });

  it('banner koneksi terputus; tersambung → banner hilang & data diambil ulang', async () => {
    renderDashboard();
    await screen.findByText('MTW-261105-0001');
    // Dua region status: banner koneksi & wadah toast.
    expect(screen.getByText('Koneksi terputus, mencoba menyambung…').getAttribute('role')).toBe('status');
    const before = fetchMock.mock.calls.filter((c) => String(c[0]).startsWith('/orders?')).length;

    socket.emitFromServer('connect');
    expect(screen.queryByText('Koneksi terputus, mencoba menyambung…')).toBeNull();
    expect(screen.getByText('Terhubung')).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter((c) => String(c[0]).startsWith('/orders?')).length).toBeGreaterThan(before),
    );
  });

  it('pencarian kode/meja & rentang tanggal dikirim sebagai query', async () => {
    renderDashboard();
    await screen.findByText('MTW-261105-0001');
    fireEvent.change(screen.getByLabelText('Cari kode / meja'), { target: { value: '0042' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/q=0042/)));

    fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-11-01' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/from=2026-11-01/)));
  });
});
