import type { PublicMenuItem } from 'shared';
import { cartItemCount, MAX_NOTE_LENGTH, summarizeCart, useCart } from './cart';

const menuItem = (id: string, name: string, price: number, isAvailable = true): PublicMenuItem => ({
  id,
  name,
  description: null,
  price,
  imageUrl: null,
  isAvailable,
});
const tuna = { menuItemId: 't1', name: 'Tuna Sambal Matah', unitPrice: 45000 };
const teh = { menuItemId: 'm1', name: 'Es Teh Serai', unitPrice: 8000 };
const state = () => useCart.getState();

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ tableToken: 'MEJA-1', lines: [] });
});

describe('store keranjang (FR-003)', () => {
  it('add menambah jumlah item yang sama, maks. 20 per baris', () => {
    state().add(tuna);
    state().add(tuna, 3);
    expect(state().lines).toEqual([{ ...tuna, quantity: 4 }]);
    state().add(tuna, 50);
    expect(state().lines[0]!.quantity).toBe(20);
  });

  it('setQuantity: 0 menghapus baris, nilai > 20 dibatasi', () => {
    state().add(tuna);
    state().add(teh);
    state().setQuantity('t1', 99);
    expect(state().lines[0]!.quantity).toBe(20);
    state().setQuantity('t1', 0);
    expect(state().lines.map((l) => l.menuItemId)).toEqual(['m1']);
  });

  it('setNote dipotong 120 karakter; catatan kosong dihapus', () => {
    state().add(tuna);
    state().setNote('t1', 'x'.repeat(200));
    expect(state().lines[0]!.note).toHaveLength(MAX_NOTE_LENGTH);
    state().setNote('t1', '');
    expect(state().lines[0]!.note).toBeUndefined();
  });

  it('bindTable mengosongkan keranjang bila pindah meja', () => {
    state().add(tuna);
    state().bindTable('MEJA-1');
    expect(state().lines).toHaveLength(1);
    state().bindTable('MEJA-2');
    expect(state()).toMatchObject({ tableToken: 'MEJA-2', lines: [] });
  });

  it('tersimpan di localStorage (tetap ada setelah refresh)', () => {
    state().add(tuna, 2);
    const saved = JSON.parse(localStorage.getItem('matwona-cart')!);
    expect(saved.state).toMatchObject({ tableToken: 'MEJA-1', lines: [{ menuItemId: 't1', quantity: 2 }] });
  });

  it('syncWithMenu memperbarui nama & harga dari menu terbaru', () => {
    state().add({ ...tuna, unitPrice: 40000, name: 'Tuna lama' });
    state().syncWithMenu(new Map([['t1', menuItem('t1', 'Tuna Sambal Matah', 45000)]]));
    expect(state().lines[0]).toMatchObject({ name: 'Tuna Sambal Matah', unitPrice: 45000 });
  });
});

describe('summarizeCart', () => {
  it('subtotal, diskon (0 sampai S3-08), total dalam integer Rupiah', () => {
    const lines = [
      { ...tuna, quantity: 2 },
      { ...teh, quantity: 1 },
    ];
    const menu = new Map([
      ['t1', menuItem('t1', tuna.name, 45000)],
      ['m1', menuItem('m1', teh.name, 8000)],
    ]);
    expect(summarizeCart(lines, menu)).toEqual({
      subtotal: 98000,
      discount: 0,
      total: 98000,
      itemCount: 3,
      unavailable: [],
    });
    expect(cartItemCount(lines)).toBe(3);
  });

  it('item habis atau sudah tidak ada di menu tidak dihitung dan dilaporkan', () => {
    const lines = [
      { ...tuna, quantity: 2 },
      { ...teh, quantity: 1 },
      { menuItemId: 'x', name: 'Menu lama', unitPrice: 1000, quantity: 1 },
    ];
    const menu = new Map([
      ['t1', menuItem('t1', tuna.name, 45000)],
      ['m1', menuItem('m1', teh.name, 8000, false)],
    ]);
    const summary = summarizeCart(lines, menu);
    expect(summary).toMatchObject({ subtotal: 90000, total: 90000, itemCount: 2 });
    expect(summary.unavailable.map((l) => l.menuItemId)).toEqual(['m1', 'x']);
  });
});
