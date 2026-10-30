import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PublicMenu } from 'shared';
import { useCart } from '@/stores/cart';
import { InvalidQr } from './invalid-qr';
import { MenuView } from './menu-view';

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
    {
      id: 'tuna',
      name: 'Olahan Tuna',
      items: [item('t1', 'Tuna Sambal Matah', 45000), item('t2', 'Tuna Asap', 40000, false)],
    },
    { id: 'minum', name: 'Minuman', items: [item('m1', 'Es Teh Serai', 8000)] },
  ],
};

const renderMenu = () => render(<MenuView token={TOKEN} tableLabel="5" outletName="Matwona" menu={MENU} />);
const tabs = () => within(screen.getByRole('navigation', { name: 'Kategori menu' })).getAllByRole('button');

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ tableToken: null, lines: [] });
});

describe('MenuView (FR-001, FR-002)', () => {
  it('header menampilkan "Meja <nomor>" dan nama outlet', () => {
    renderMenu();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Meja 5');
    expect(screen.getByText('Matwona')).toBeTruthy();
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
    expect(screen.getByText('Habis')).toBeTruthy();
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

    const group = await screen.findByRole('group', { name: 'Jumlah Tuna Sambal Matah' });
    fireEvent.click(within(group).getByRole('button', { name: 'Tambah satu Tuna Sambal Matah' }));
    expect(within(group).getByText('2')).toBeTruthy();

    fireEvent.click(within(group).getByRole('button', { name: 'Kurangi Tuna Sambal Matah' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Kurangi Tuna Sambal Matah' }));
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
