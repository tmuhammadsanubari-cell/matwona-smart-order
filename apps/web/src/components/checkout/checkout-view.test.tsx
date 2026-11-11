import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorCode } from 'shared';
import type { PublicMenu } from 'shared';
import { ApiClientError, apiFetch } from '@/lib/api';
import { activeOrderForTable } from '@/lib/placed-orders';
import { useCart } from '@/stores/cart';
import { CheckoutView } from './checkout-view';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

const TOKEN = 'TokenMejaLima0000000000';
const item = (id: string, name: string, price: number, isAvailable = true) => ({
  id,
  name,
  description: null,
  price,
  imageUrl: null,
  isAvailable,
});
const MENU: PublicMenu = {
  outlet: { id: 'o1', slug: 'matwona', name: 'Matwona' },
  categories: [
    { id: 'tuna', name: 'Olahan Tuna', items: [item('t1', 'Tuna Sambal Matah', 45000), item('t2', 'Tuna Asap', 40000, false)] },
    { id: 'minum', name: 'Minuman', items: [item('m1', 'Es Teh Serai', 8000)] },
  ],
};
const ORDER = { orderCode: 'MTW-261105-0042', createdAt: new Date().toISOString() };

function saveCart(lines: object[]) {
  localStorage.setItem('matwona-cart', JSON.stringify({ state: { tableToken: TOKEN, lines }, version: 0 }));
}
const renderCheckout = () => render(<CheckoutView token={TOKEN} outletSlug="matwona" tableLabel="5" menu={MENU} />);
const submit = () => fireEvent.click(screen.getByRole('button', { name: /^Pesan Sekarang/ }));
const fillName = (value = 'Rina') => fireEvent.change(screen.getByLabelText('Nama kamu'), { target: { value } });

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ tableToken: null, lines: [] });
  fetchMock.mockReset();
  replace.mockReset();
});

describe('Checkout (FR-004, FR-006)', () => {
  it('keranjang kosong → ajakan kembali ke menu', async () => {
    renderCheckout();
    expect(await screen.findByText('Keranjangmu masih kosong')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lihat menu' }).getAttribute('href')).toBe(`/m/matwona/t/${TOKEN}`);
  });

  it('ringkasan pesanan, catatan, total; QRIS belum tersedia, bayar di kasir terpilih', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 2, note: 'sambal dipisah' }]);
    renderCheckout();
    expect(await screen.findByText('2× Tuna Sambal Matah')).toBeTruthy();
    expect(screen.getByText('Catatan: sambal dipisah')).toBeTruthy();
    expect(screen.getAllByText('Rp 90.000').length).toBeGreaterThan(0);
    expect((screen.getByRole('radio', { name: /Bayar di Kasir/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /^QRIS/ }) as HTMLInputElement).disabled).toBe(true);
  });

  it('header (desain C4): kembali ke menu, meja, langkah 3 dari 4; tombol kirim memuat total', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 2 }]);
    renderCheckout();
    await screen.findByText('2× Tuna Sambal Matah');
    expect(screen.getByRole('link', { name: 'Kembali ke menu' }).getAttribute('href')).toBe(`/m/matwona/t/${TOKEN}`);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Checkout');
    expect(screen.getByText('Meja 5')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Langkah 3 dari 4' })).toBeTruthy();
    expect(screen.getByText('Ringkasan pesanan · 2 item')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pesan Sekarang · Rp 90.000' })).toBeTruthy();
  });

  it('validasi: nama wajib 2–50 karakter, HP opsional format Indonesia — tanpa memanggil API', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }]);
    renderCheckout();
    await screen.findByText('1× Tuna Sambal Matah');

    fillName('R');
    fireEvent.change(screen.getByLabelText('No. HP (opsional)'), { target: { value: '12345' } });
    submit();
    expect(screen.getByText('Nama minimal 2 karakter')).toBeTruthy();
    expect(screen.getByText('Format no. HP tidak valid')).toBeTruthy();
    expect(screen.getByLabelText('Nama kamu').getAttribute('aria-invalid')).toBe('true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sukses: kirim payload, simpan pesanan, kosongkan keranjang, ke halaman status', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 2, note: 'pedas' }]);
    fetchMock.mockResolvedValue(ORDER);
    renderCheckout();
    await screen.findByText('2× Tuna Sambal Matah');
    fillName();
    fireEvent.change(screen.getByLabelText('No. HP (opsional)'), { target: { value: '081234567890' } });
    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/m/matwona/order/MTW-261105-0042'));
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/public/orders');
    expect(init).toMatchObject({ method: 'POST', tableToken: TOKEN });
    expect(init!.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(init!.body as string)).toEqual({
      customerName: 'Rina',
      customerPhone: '081234567890',
      paymentMethod: 'CASHIER',
      items: [{ menuItemId: 't1', quantity: 2, note: 'pedas', fromRecommendation: false, expectedUnitPrice: 45000 }],
    });
    expect(useCart.getState().lines).toEqual([]);
    expect(activeOrderForTable(TOKEN)?.code).toBe('MTW-261105-0042');
  });

  it('kirim ulang setelah gagal memakai Idempotency-Key yang sama', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }]);
    fetchMock
      .mockRejectedValueOnce(new ApiClientError(500, { code: ErrorCode.INTERNAL_ERROR, message: 'Gagal terhubung ke server. Coba lagi.' }))
      .mockResolvedValueOnce(ORDER);
    renderCheckout();
    await screen.findByText('1× Tuna Sambal Matah');
    fillName();
    submit();
    expect(await screen.findByRole('alert')).toBeTruthy();
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]![1]!.idempotencyKey).toBe(fetchMock.mock.calls[1]![1]!.idempotencyKey);
  });

  it('ITEM_UNAVAILABLE: item habis dihapus dari keranjang dan disebutkan namanya', async () => {
    saveCart([
      { menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 },
      { menuItemId: 'm1', name: 'Es Teh Serai', unitPrice: 8000, quantity: 1 },
    ]);
    fetchMock.mockRejectedValue(
      new ApiClientError(409, {
        code: ErrorCode.ITEM_UNAVAILABLE,
        message: 'Beberapa menu sudah habis.',
        details: { items: [{ menuItemId: 'm1', name: 'Es Teh Serai' }] },
      }),
    );
    renderCheckout();
    await screen.findByText('1× Es Teh Serai');
    fillName();
    submit();

    expect((await screen.findByRole('alert')).textContent).toContain('Es Teh Serai baru saja habis');
    expect(useCart.getState().lines.map((l) => l.menuItemId)).toEqual(['t1']);
    expect(screen.queryByText('1× Es Teh Serai')).toBeNull();
  });

  it('PRICE_CHANGED: harga di keranjang diperbarui, total ikut berubah', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }]);
    fetchMock.mockRejectedValue(
      new ApiClientError(409, {
        code: ErrorCode.PRICE_CHANGED,
        message: 'Harga berubah.',
        details: { items: [{ menuItemId: 't1', name: 'Tuna Sambal Matah', expectedUnitPrice: 45000, unitPrice: 47000 }] },
      }),
    );
    renderCheckout();
    await screen.findByText('1× Tuna Sambal Matah');
    fillName();
    submit();

    expect((await screen.findByRole('alert')).textContent).toContain('Harga Tuna Sambal Matah berubah');
    expect(useCart.getState().lines[0]!.unitPrice).toBe(47000);
    expect(screen.getAllByText('Rp 47.000').length).toBeGreaterThan(0);
  });

  it('error lain (mis. rate limit) menampilkan pesan dari server', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }]);
    fetchMock.mockRejectedValue(new ApiClientError(429, { code: ErrorCode.RATE_LIMITED, message: 'Terlalu banyak pesanan.' }));
    renderCheckout();
    await screen.findByText('1× Tuna Sambal Matah');
    fillName();
    submit();
    expect((await screen.findByRole('alert')).textContent).toBe('Terlalu banyak pesanan.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('item yang sudah habis saat checkout dibuka menahan tombol kirim', async () => {
    saveCart([{ menuItemId: 't2', name: 'Tuna Asap', unitPrice: 40000, quantity: 1 }]);
    renderCheckout();
    expect((await screen.findByRole('alert')).textContent).toContain('sudah habis');
    expect((screen.getByRole('button', { name: /^Pesan Sekarang/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
