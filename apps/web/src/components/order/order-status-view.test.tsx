import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import { ErrorCode, SocketEvent } from 'shared';
import type { PublicOrderDto } from 'shared';
import { ApiClientError, apiFetch } from '@/lib/api';
import { activeOrderForTable, rememberOrder } from '@/lib/placed-orders';
import { connectRealtime } from '@/lib/socket';
import { OrderStatusView } from './order-status-view';

vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), apiFetch: vi.fn() }));
vi.mock('@/lib/socket', () => ({ connectRealtime: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

/** Socket palsu: simpan handler agar test bisa memicu event server. */
function fakeSocket() {
  const handlers = new Map<string, (payload?: unknown) => void>();
  const socket = {
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    disconnect: vi.fn(),
    emitFromServer: (event: string, payload?: unknown) => act(() => handlers.get(event)?.(payload)),
  };
  return socket;
}

const CODE = 'MTW-261105-0042';
const TOKEN = 'TokenMejaLima0000000000';
const ORDER: PublicOrderDto = {
  orderCode: CODE,
  table: '5',
  customerName: 'Rina',
  status: 'NEW',
  paymentMethod: 'CASHIER',
  paymentStatus: 'UNPAID',
  subtotalAmount: 98000,
  discountAmount: 0,
  totalAmount: 98000,
  items: [
    { menuItemId: 't1', name: 'Tuna Sambal Matah', quantity: 2, unitPrice: 45000, discountAmount: 0, lineTotal: 90000, note: 'pedas' },
    { menuItemId: 'm1', name: 'Es Teh Serai', quantity: 1, unitPrice: 8000, discountAmount: 0, lineTotal: 8000, note: null },
  ],
  createdAt: '2026-11-05T05:12:44Z',
};

let socket: ReturnType<typeof fakeSocket>;

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrderStatusView outlet="matwona" code={CODE} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  socket = fakeSocket();
  vi.mocked(connectRealtime).mockReset().mockReturnValue(socket as never);
});

describe('Status pesanan (FR-007)', () => {
  it('bukan perangkat pemesan → pesan tidak ditemukan, tanpa memanggil API/socket', async () => {
    renderStatus();
    expect(await screen.findByText('Pesanan tidak ditemukan di perangkat ini')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(connectRealtime).not.toHaveBeenCalled();
  });

  it('memuat pesanan dengan token meja, menampilkan progres, pembayaran & rincian', async () => {
    rememberOrder({ code: CODE, outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() });
    fetchMock.mockResolvedValue(ORDER);
    renderStatus();

    expect(await screen.findByText('Pesananmu sudah masuk. Tunggu konfirmasi kasir ya.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/public/orders/${CODE}`, expect.objectContaining({ tableToken: TOKEN }));
    expect(connectRealtime).toHaveBeenCalledWith({ tableToken: TOKEN, orderCode: CODE });

    const steps = within(screen.getByRole('list', { name: 'Progres pesanan' })).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(['Menunggu kasir', 'Diterima kasir', 'Sedang disiapkan', 'Disajikan']);
    expect(steps[0]!.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Belum bayar')).toBeTruthy();
    expect(screen.getByText(/Bayar di kasir sebesar Rp 98.000/)).toBeTruthy();
    expect(screen.getByText('Catatan: pedas')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Pesan menu lain' }).getAttribute('href')).toBe(`/m/matwona/t/${TOKEN}`);
  });

  it('event realtime memperbarui status & pembayaran tanpa refresh', async () => {
    rememberOrder({ code: CODE, outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() });
    fetchMock.mockResolvedValue(ORDER);
    renderStatus();
    await screen.findByText('Pesananmu sudah masuk. Tunggu konfirmasi kasir ya.');

    socket.emitFromServer(SocketEvent.ORDER_UPDATED, { orderCode: CODE, status: 'CONFIRMED' });
    // TanStack Query menjadwalkan render ulang secara asinkron.
    expect(await screen.findByText('Pesananmu sudah diterima kasir 🙌')).toBeTruthy();

    socket.emitFromServer(SocketEvent.PAYMENT_UPDATED, { orderCode: CODE, paymentStatus: 'PAID' });
    expect(await screen.findByText('Lunas')).toBeTruthy();
    expect(screen.getByText('Sudah dibayar di kasir. Terima kasih!')).toBeTruthy();
  });

  it('koneksi putus → banner + polling; tersambung → banner hilang', async () => {
    rememberOrder({ code: CODE, outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() });
    fetchMock.mockResolvedValue(ORDER);
    renderStatus();
    await screen.findByText('Pesananmu sudah masuk. Tunggu konfirmasi kasir ya.');

    expect(screen.getByRole('status').textContent).toContain('Koneksi terputus');
    socket.emitFromServer('connect');
    expect(screen.queryByRole('status')).toBeNull();
    socket.emitFromServer('disconnect');
    expect(screen.getByRole('status').textContent).toContain('tiap 10 detik');
  });

  it('pesanan selesai → banner "pesanan aktif" di menu tidak muncul lagi', async () => {
    rememberOrder({ code: CODE, outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() });
    fetchMock.mockResolvedValue({ ...ORDER, status: 'COMPLETED', paymentStatus: 'PAID' });
    renderStatus();
    await screen.findByText('Pesanan selesai. Terima kasih sudah makan di Matwona!');
    expect(activeOrderForTable(TOKEN)).toBeUndefined();
  });

  it('token tidak cocok (API 404) → pesan tidak ditemukan', async () => {
    rememberOrder({ code: CODE, outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() });
    fetchMock.mockRejectedValue(new ApiClientError(404, { code: ErrorCode.NOT_FOUND, message: 'Pesanan tidak ditemukan.' }));
    renderStatus();
    expect(await screen.findByText('Pesanan tidak ditemukan di perangkat ini')).toBeTruthy();
  });
});
