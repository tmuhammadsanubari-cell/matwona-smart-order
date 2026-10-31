import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { PublicMenu } from 'shared';
import { useCart } from '@/stores/cart';
import { InvalidQr } from './invalid-qr';
import { MenuView } from './menu-view';

const TOKEN = 'TokenMejaLima0000000000';
const item = (id: string, name: string, price: number, isAvailable = true) => ({
  id,
  name,
  description: null as string | null,
  price,
  imageUrl: null,
  isAvailable,
});
const MENU: PublicMenu = {
  outlet: { id: 'o1', slug: 'matwona', name: 'Matwona' },
  categories: [
    {
      id: 'tuna',
      name: 'Olahan Tuna',
      items: [item('t1', 'Tuna Sambal Matah', 45000), item('t2', 'Tuna Asap', 40000, false)],
    },
    { id: 'minum', name: 'Minuman', items: [item('m1', 'Es Teh Serai', 8000)] },
  ],
};

const renderMenu = () => render(<MenuView token={TOKEN} tableLabel="5" menu={MENU} />);
const tabs = () => within(screen.getByRole('navigation', { name: 'Kategori menu' })).getAllByRole('button');

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ tableToken: null, lines: [] });
});

describe('MenuView (FR-001, FR-002)', () => {
  it('header menampilkan logo dan "Meja <nomor>"', () => {
    renderMenu();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Meja 5');
    expect(screen.getByRole('img', { name: 'Matwona' })).toBeTruthy();
  });

  it('kategori & item terurut sesuai server; tab kategori aktif pertama', () => {
    renderMenu();
    expect(tabs().map((t) => t.textContent)).toEqual(['Olahan Tuna', 'Minuman']);
    expect(tabs()[0]!.getAttribute('aria-current')).toBe('true');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Tuna Sambal Matah',
      'Tuna Asap',
      'Es Teh Serai',
    ]);
    expect(screen.getByText('Rp 45.000')).toBeTruthy();
  });

  it('item habis: label "Habis" dan tombol tambah nonaktif', () => {
    renderMenu();
    const soldOut = screen.getByRole('button', { name: 'Tuna Asap habis' }) as HTMLButtonElement;
    expect(soldOut.disabled).toBe(true);
    // Label "Habis" di foto + teks tombol nonaktif.
    expect(screen.getAllByText('Habis')).toHaveLength(2);
  });

  it('klik tab memilih kategori', () => {
    renderMenu();
    fireEvent.click(tabs()[1]!);
    expect(tabs()[1]!.getAttribute('aria-current')).toBe('true');
  });

  it('pencarian memfilter instan (tanpa beda huruf besar) dan menyembunyikan kategori kosong', () => {
    renderMenu();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari menu' }), { target: { value: 'TEH' } });
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Es Teh Serai']);
    expect(tabs().map((t) => t.textContent)).toEqual(['Minuman']);
    expect(screen.getByText('1 menu ditemukan')).toBeTruthy();
  });

  it('pencarian tanpa hasil menampilkan pesan dan tombol hapus pencarian', () => {
    renderMenu();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rendang' } });
    expect(screen.getByText(/tidak ditemukan/).textContent).toContain('rendang');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('Tambah memasukkan ke keranjang meja ini lalu berubah menjadi stepper', async () => {
    renderMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' }));
    expect(useCart.getState()).toMatchObject({
      tableToken: TOKEN,
      lines: [{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }],
    });
    expect(screen.getByRole('status').textContent).toBe('Ditambahkan ke keranjang');

    const group = await screen.findByRole('group', { name: 'Jumlah Tuna Sambal Matah' });
    fireEvent.click(within(group).getByRole('button', { name: 'Tambah satu Tuna Sambal Matah' }));
    expect(within(group).getByText('2')).toBeTruthy();

    fireEvent.click(within(group).getByRole('button', { name: 'Kurangi Tuna Sambal Matah' }));
    // Di jumlah 1 tombol − menghapus item dari keranjang.
    fireEvent.click(within(group).getByRole('button', { name: 'Hapus Tuna Sambal Matah' }));
    expect(useCart.getState().lines).toEqual([]);
    expect(await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' })).toBeTruthy();
  });

  it('keranjang tersimpan per token: isi meja yang sama dimuat, meja lain dikosongkan', async () => {
    const saved = (token: string) =>
      JSON.stringify({
        state: { tableToken: token, lines: [{ menuItemId: 'm1', name: 'Es Teh Serai', unitPrice: 8000, quantity: 3 }] },
        version: 0,
      });

    localStorage.setItem('matwona-cart', saved(TOKEN));
    const { unmount } = renderMenu();
    expect(await screen.findByRole('group', { name: 'Jumlah Es Teh Serai' })).toBeTruthy();
    unmount();

    localStorage.setItem('matwona-cart', saved('TokenMejaLainnya0000000'));
    renderMenu();
    expect(await screen.findByRole('button', { name: 'Tambah Es Teh Serai' })).toBeTruthy();
    expect(useCart.getState()).toMatchObject({ tableToken: TOKEN, lines: [] });
  });
});

describe('InvalidQr (FR-001)', () => {
  it('menampilkan pesan QR tidak dikenali tanpa menu', () => {
    render(<InvalidQr />);
    expect(screen.getByRole('heading').textContent).toBe('QR tidak dikenali, silakan hubungi kasir');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Banner pesanan aktif (FR-007)', () => {
  it('menampilkan banner "Ada pesanan aktif" untuk pesanan meja ini yang belum selesai', async () => {
    localStorage.setItem(
      'matwona-orders',
      JSON.stringify([{ code: 'MTW-261105-0042', outlet: 'matwona', tableToken: TOKEN, createdAt: new Date().toISOString() }]),
    );
    renderMenu();
    const link = await screen.findByRole('link', { name: /pesanan aktif MTW-261105-0042/ });
    expect(link.getAttribute('href')).toBe('/m/matwona/order/MTW-261105-0042');
  });

  it('tidak ada banner untuk pesanan meja lain', async () => {
    localStorage.setItem(
      'matwona-orders',
      JSON.stringify([{ code: 'MTW-261105-0042', outlet: 'matwona', tableToken: 'MejaLain', createdAt: new Date().toISOString() }]),
    );
    renderMenu();
    await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' });
    expect(screen.queryByRole('link', { name: /pesanan aktif/ })).toBeNull();
  });
});

describe('Detail menu (FR-002, FR-003, desain C2)', () => {
  it('ketuk kartu membuka detail; catatan & jumlah ikut masuk keranjang lalu sheet tertutup', async () => {
    renderMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat detail Tuna Sambal Matah' }));
    const sheet = screen.getByRole('dialog', { name: 'Tuna Sambal Matah' });

    // Di sheet detail jumlah minimal 1: tombol − nonaktif, bukan "Hapus".
    expect((within(sheet).getByRole('button', { name: 'Kurangi Tuna Sambal Matah' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(sheet).getByLabelText('Catatan (opsional)'), { target: { value: ' sambal dipisah ' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tambah satu Tuna Sambal Matah' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tambah ke Keranjang · Rp 90.000' }));

    expect(useCart.getState().lines).toEqual([
      { menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 2, note: 'sambal dipisah' },
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Ditambahkan ke keranjang');
  });

  it('membuka lagi item yang sudah di keranjang: catatan lama terisi, jumlah ditambahkan', async () => {
    renderMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' }));
    act(() => useCart.getState().setNote('t1', 'tidak pedas'));

    fireEvent.click(screen.getByRole('button', { name: 'Lihat detail Tuna Sambal Matah' }));
    const sheet = screen.getByRole('dialog', { name: 'Tuna Sambal Matah' });
    expect((within(sheet).getByLabelText('Catatan (opsional)') as HTMLTextAreaElement).value).toBe('tidak pedas');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tambah ke Keranjang · Rp 45.000' }));
    expect(useCart.getState().lines[0]).toMatchObject({ quantity: 2, note: 'tidak pedas' });
  });

  it('item habis: detail tetap bisa dilihat tetapi tombol tambah nonaktif', async () => {
    renderMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat detail Tuna Asap' }));
    const sheet = screen.getByRole('dialog', { name: 'Tuna Asap' });
    expect(within(sheet).getByText('Menu ini sedang habis.')).toBeTruthy();
    expect((within(sheet).getByRole('button', { name: 'Habis' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(sheet).queryByLabelText('Catatan (opsional)')).toBeNull();
  });
});
