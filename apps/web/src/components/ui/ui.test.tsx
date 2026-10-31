import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ConnectionBanner,
  EmptyState,
  Input,
  Logo,
  PhotoPlaceholder,
  ProgressSteps,
  QuantityStepper,
  Textarea,
  toast,
  Toaster,
  TOAST_DURATION_MS,
} from '.';

describe('Button', () => {
  it('default type="button", tinggi minimal 44 px, varian primary', () => {
    render(<Button>Tambah</Button>);
    const button = screen.getByRole('button', { name: 'Tambah' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('bg-primary');
  });

  it('sudut 12 px (rounded-control), bukan pil', () => {
    render(<Button>Tambah</Button>);
    const { className } = screen.getByRole('button');
    expect(className).toContain('rounded-control');
    expect(className).not.toContain('rounded-full');
  });

  it('disabled: latar abu-abu solid tanpa opacity agar teks "Habis" tetap kontras', () => {
    render(<Button disabled>Habis</Button>);
    const { className } = screen.getByRole('button', { name: 'Habis' });
    expect(className).toContain('disabled:bg-disabled');
    expect(className).toContain('disabled:text-neutral');
    expect(className).not.toContain('opacity-50');
  });

  it('loading tetap berwarna varian, bukan abu-abu disabled', () => {
    render(<Button loading>Mengirim pesanan…</Button>);
    const { className } = screen.getByRole('button');
    expect(className).toContain('bg-primary');
    expect(className).not.toContain('disabled:bg-disabled');
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
    expect(className).toContain('min-h-12');
    expect(className).toContain('w-full');
  });
});

describe('Badge & Card', () => {
  it('Badge memakai kelas tone', () => {
    render(<Badge tone="success">Lunas</Badge>);
    expect(screen.getByText('Lunas').className).toContain('bg-success-soft');
  });

  it('Badge danger-solid untuk label Habis', () => {
    render(<Badge tone="danger-solid">Habis</Badge>);
    expect(screen.getByText('Habis').className).toContain('bg-danger');
  });

  it('Card muted: teks muted & foto grayscale tanpa opacity (badge Habis tetap kontras)', () => {
    render(<Card muted>Habis</Card>);
    const card = screen.getByText('Habis');
    expect(card.className).toContain('text-muted');
    expect(card.className).toContain('[&_img]:grayscale');
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

  it('Textarea dengan maxLength menampilkan penghitung yang ikut berubah saat mengetik', () => {
    const onChange = vi.fn();
    render(<Textarea label="Catatan" maxLength={120} onChange={onChange} />);
    expect(screen.getByText('0/120')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'sambal dipisah' } });
    expect(screen.getByText('14/120')).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('Textarea terkontrol menghitung dari value', () => {
    render(<Textarea label="Catatan" maxLength={120} value="pedas" onChange={() => {}} />);
    expect(screen.getByText('5/120')).toBeTruthy();
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

describe('QuantityStepper', () => {
  it('− dari 1 bertuliskan Hapus dan mengirim 0; + menambah satu', () => {
    const onChange = vi.fn();
    render(<QuantityStepper itemName="Tuna Geprek" quantity={1} max={20} onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'Jumlah Tuna Geprek' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Tuna Geprek' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah satu Tuna Geprek' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('tombol + nonaktif saat mencapai batas', () => {
    render(<QuantityStepper itemName="Es Jeruk" quantity={20} max={20} onChange={() => {}} />);
    const plus = screen.getByRole('button', { name: 'Tambah satu Es Jeruk' }) as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Kurangi Es Jeruk' })).toBeTruthy();
  });
});

describe('ProgressSteps', () => {
  it('menandai langkah aktif dengan aria-current="step" dan langkah selesai untuk pembaca layar', () => {
    render(
      <ProgressSteps
        steps={[
          { label: 'Menunggu Pembayaran', state: 'done', time: '12:10' },
          { label: 'Diterima Kasir', state: 'current', time: 'Sekarang' },
          { label: 'Disajikan', state: 'todo' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]!.getAttribute('aria-current')).toBe('step');
    expect(items[0]!.textContent).toContain('(selesai)');
    expect(items[0]!.textContent).toContain('12:10');
    expect(items[2]!.getAttribute('aria-current')).toBeNull();
  });
});

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('toast() menampilkan pesan di region status lalu hilang sendiri', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    act(() => toast('Ditambahkan ke keranjang'));
    expect(region.textContent).toBe('Ditambahkan ke keranjang');

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(region.textContent).toBe('');
  });
});

describe('EmptyState, ConnectionBanner, PhotoPlaceholder, Logo', () => {
  it('EmptyState menampilkan judul, deskripsi, dan aksi', () => {
    render(
      <EmptyState
        title="Keranjangmu masih kosong"
        description="Yuk pilih tuna atau ayam kampung favoritmu."
        action={<a href="#menu">Lihat menu</a>}
      />,
    );
    expect(screen.getByText('Keranjangmu masih kosong')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lihat menu' })).toBeTruthy();
  });

  it('ConnectionBanner diumumkan sebagai status, ikon tidak ikut terbaca', () => {
    render(<ConnectionBanner>Koneksi terputus, mencoba menyambung…</ConnectionBanner>);
    expect(screen.getByRole('status').textContent).toBe('Koneksi terputus, mencoba menyambung…');
  });

  it('PhotoPlaceholder dekoratif dengan warna sesuai jenis menu', () => {
    const { container } = render(<PhotoPlaceholder tone="tuna" className="size-24" />);
    const placeholder = container.firstElementChild!;
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder.className).toContain('bg-photo-tuna');
  });

  it('Logo memakai file resmi di public/brand', () => {
    render(<Logo variant="green" width={150} />);
    const logo = screen.getByRole('img', { name: 'Matwona' });
    expect(logo.getAttribute('src')).toContain('matwona-logo-green.png');
  });
});
