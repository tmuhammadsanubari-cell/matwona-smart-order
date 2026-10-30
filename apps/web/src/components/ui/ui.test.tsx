import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Badge, BottomSheet, Button, Card, Input, Textarea } from '.';

describe('Button', () => {
  it('default type="button", tinggi minimal 44 px, varian primary', () => {
    render(<Button>Tambah</Button>);
    const button = screen.getByRole('button', { name: 'Tambah' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('bg-primary');
  });

  it('loading menonaktifkan tombol dan menandai aria-busy', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pesan
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Pesan' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('varian & ukuran lain', () => {
    render(
      <Button variant="danger" size="lg" fullWidth>
        Batalkan
      </Button>,
    );
    const { className } = screen.getByRole('button');
    expect(className).toContain('bg-danger');
    expect(className).toContain('min-h-13');
    expect(className).toContain('w-full');
  });
});

describe('Badge & Card', () => {
  it('Badge memakai kelas tone', () => {
    render(<Badge tone="success">Lunas</Badge>);
    expect(screen.getByText('Lunas').className).toContain('bg-primary-soft');
  });

  it('Card muted: latar abu-abu & teks muted tanpa opacity (badge Habis tetap kontras)', () => {
    render(<Card muted>Habis</Card>);
    const card = screen.getByText('Habis');
    expect(card.className).toContain('bg-line');
    expect(card.className).toContain('text-muted');
    expect(card.className).not.toContain('opacity');
    expect(card.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('Input & Textarea', () => {
  it('label terhubung ke input; hint terbaca screen reader', () => {
    render(<Input label="No. HP" hint="Opsional" />);
    const input = screen.getByLabelText('No. HP');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    const hint = screen.getByText('Opsional');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('error: aria-invalid, role alert, dan ikut aria-describedby', () => {
    render(<Input label="Nama" hint="Untuk dipanggil" error="Nama minimal 2 karakter" />);
    const input = screen.getByLabelText('Nama');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Nama minimal 2 karakter');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
    expect(input.className).toContain('border-danger');
  });

  it('Textarea untuk catatan meneruskan maxLength', () => {
    render(<Textarea label="Catatan" maxLength={120} />);
    expect(screen.getByLabelText('Catatan').getAttribute('maxlength')).toBe('120');
  });
});

function SheetHarness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Buka keranjang</button>
      <BottomSheet
        open={open}
        title="Keranjang"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        footer={<button>Pesan Sekarang</button>}
      >
        <p>Tuna Sambal Matah × 2</p>
      </BottomSheet>
    </>
  );
}

describe('BottomSheet', () => {
  it('tertutup: tidak merender apa pun', () => {
    render(<BottomSheet open={false} onClose={() => {}} title="Keranjang">isi</BottomSheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('terbuka: dialog modal berjudul, footer terlihat, scroll halaman dikunci', () => {
    render(<SheetHarness />);
    fireEvent.click(screen.getByText('Buka keranjang'));
    const dialog = screen.getByRole('dialog', { name: 'Keranjang' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Pesan Sekarang')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('fokus pindah ke dalam panel lalu kembali ke tombol pemicu saat ditutup', () => {
    render(<SheetHarness />);
    const trigger = screen.getByText('Buka keranjang');
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });

  it('Escape dan klik latar menutup panel', () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByText('Buka keranjang'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Buka keranjang'));
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Tab di elemen terakhir kembali ke elemen pertama (fokus terjebak di panel)', () => {
    render(<SheetHarness />);
    fireEvent.click(screen.getByText('Buka keranjang'));
    const close = screen.getByRole('button', { name: 'Tutup' });
    const last = screen.getByRole('button', { name: 'Pesan Sekarang' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
