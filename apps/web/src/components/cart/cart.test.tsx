import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PublicMenu } from 'shared';
import { MenuView } from '@/components/menu/menu-view';
import { useCart } from '@/stores/cart';

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

const renderMenu = () => render(<MenuView token={TOKEN} tableLabel="5" menu={MENU} />);

function saveCart(lines: object[]) {
  localStorage.setItem('matwona-cart', JSON.stringify({ state: { tableToken: TOKEN, lines }, version: 0 }));
}

async function openCart() {
  fireEvent.click(await screen.findByRole('button', { name: /^Lihat keranjang/ }));
  return screen.getByRole('dialog', { name: 'Keranjang · Meja 5' });
}

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ tableToken: null, lines: [] });
});

describe('Keranjang (FR-003)', () => {
  it('bar keranjang tersembunyi saat kosong, muncul dengan jumlah item & total setelah Tambah', async () => {
    renderMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Es Teh Serai' }));
    const bar = screen.getByRole('button', { name: /^Lihat keranjang/ });
    expect(bar.getAttribute('aria-label')).toBe('Lihat keranjang, 2 item, total Rp 53.000');
    expect(screen.getByText('2 item')).toBeTruthy();
    expect(screen.getAllByText('Rp 53.000').length).toBeGreaterThan(0);
  });

  it('tidak ada bar saat keranjang kosong', async () => {
    renderMenu();
    await screen.findByRole('button', { name: 'Tambah Tuna Sambal Matah' });
    expect(screen.queryByRole('button', { name: /^Lihat keranjang/ })).toBeNull();
  });

  it('bottom sheet: rincian, subtotal & total, ubah jumlah 1–20, tombol lanjut ke checkout', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 2 }]);
    renderMenu();
    const sheet = await openCart();

    expect(within(sheet).getByText('Rp 45.000 × 2')).toBeTruthy();
    expect(within(sheet).getByText('Subtotal').nextElementSibling!.textContent).toBe('Rp 90.000');
    expect(within(sheet).getByText('Total').nextElementSibling!.textContent).toBe('Rp 90.000');
    // Diskon promo baru tampil bila ada (S3-08).
    expect(within(sheet).queryByText('Diskon promo')).toBeNull();

    fireEvent.click(within(sheet).getByRole('button', { name: 'Tambah satu Tuna Sambal Matah' }));
    expect(within(sheet).getByText('Total').nextElementSibling!.textContent).toBe('Rp 135.000');

    const link = within(sheet).getByRole('link', { name: 'Lanjut ke Pembayaran' });
    expect(link.getAttribute('href')).toBe(`/m/matwona/t/${TOKEN}/checkout`);
  });

  it('catatan per item maks. 120 karakter dengan penghitung, tersimpan di store', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 }]);
    renderMenu();
    const sheet = await openCart();

    fireEvent.click(within(sheet).getByRole('button', { name: '+ Catatan' }));
    const note = within(sheet).getByLabelText('Catatan untuk Tuna Sambal Matah');
    expect(note.getAttribute('maxlength')).toBe('120');
    fireEvent.change(note, { target: { value: 'sambal dipisah' } });
    expect(useCart.getState().lines[0]!.note).toBe('sambal dipisah');
    expect(within(sheet).getByText('14/120')).toBeTruthy();

    // "Selesai" menutup editor; catatan tampil sebagai teks dan tombol berubah jadi "Edit catatan".
    fireEvent.click(within(sheet).getByRole('button', { name: 'Selesai' }));
    expect(within(sheet).getByText('Catatan: sambal dipisah')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'Edit catatan' })).toBeTruthy();
  });

  it('menghapus item terakhir menampilkan keranjang kosong', async () => {
    saveCart([{ menuItemId: 'm1', name: 'Es Teh Serai', unitPrice: 8000, quantity: 1 }]);
    renderMenu();
    const sheet = await openCart();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Hapus Es Teh Serai' }));
    expect(within(sheet).getByText('Keranjangmu masih kosong')).toBeTruthy();
    expect(useCart.getState().lines).toEqual([]);
  });

  it('item yang sudah habis ditandai, tidak dihitung, dan menahan checkout sampai dihapus', async () => {
    saveCart([
      { menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000, quantity: 1 },
      { menuItemId: 't2', name: 'Tuna Asap', unitPrice: 40000, quantity: 1 },
    ]);
    renderMenu();
    const sheet = await openCart();

    expect(within(sheet).getByText('Habis · tidak bisa dipesan')).toBeTruthy();
    expect(within(sheet).getByText('Total').nextElementSibling!.textContent).toBe('Rp 45.000');
    expect(within(sheet).getByRole('alert').textContent).toBe('Tuna Asap baru saja habis. Hapus dari keranjang untuk lanjut.');
    expect((within(sheet).getByRole('button', { name: 'Lanjut ke Pembayaran' }) as HTMLButtonElement).disabled).toBe(true);
    // Item habis tidak punya stepper, hanya tombol hapus.
    expect(within(sheet).queryByRole('group', { name: 'Jumlah Tuna Asap' })).toBeNull();

    fireEvent.click(within(sheet).getByRole('button', { name: 'Hapus Tuna Asap dari keranjang' }));
    expect(within(sheet).getByRole('link', { name: 'Lanjut ke Pembayaran' })).toBeTruthy();
  });

  it('harga di keranjang mengikuti menu terbaru', async () => {
    saveCart([{ menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 40000, quantity: 1 }]);
    renderMenu();
    const sheet = await openCart();
    expect(within(sheet).getByText('Rp 45.000 × 1')).toBeTruthy();
    expect(useCart.getState().lines[0]!.unitPrice).toBe(45000);
  });
});
