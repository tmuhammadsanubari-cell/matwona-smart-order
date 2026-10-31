'use client';

import { useState } from 'react';
import { formatRupiah, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from 'shared';
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
} from '@/components/ui';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/status-tone';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** Katalog komponen dasar, mengikuti artboard "Design System Matwona" di kanvas Claude Design. */
export function UiPreview() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 p-4 pb-24">
      <Toaster />
      <header className="-mx-4 -mt-4 flex flex-col gap-2 bg-primary px-4 py-4 text-primary-foreground">
        <Logo priority />
        <p className="text-sm text-cream">UI kit · cek di lebar 360 px (DevTools → responsive).</p>
      </header>

      <Section title="Tipografi">
        <p className="text-display font-extrabold">Simply, makan.</p>
        <p className="text-h1 font-extrabold">Olahan Tuna</p>
        <p className="text-h2 font-bold">Populer sekarang</p>
        <p className="text-lg font-bold">Tuna Sambal Matah</p>
        <p>Pesananmu sudah diterima kasir.</p>
        <p className="text-sm text-muted">Tuna segar dibakar, disiram sambal matah.</p>
        <p className="text-xs font-semibold text-muted">Paling sering dipesan siang ini</p>
      </Section>

      <Section title="Button">
        <Button fullWidth size="lg">
          Pesan Sekarang
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button>+ Tambah</Button>
          <Button variant="secondary">Lihat menu saja</Button>
          <Button variant="ghost">Kembali ke menu</Button>
          <Button variant="danger">Batalkan Pesanan</Button>
          <Button disabled>Habis</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? 'Mengirim pesanan…' : 'Coba loading'}
          </Button>
        </div>
      </Section>

      <Section title="Stepper">
        <div>
          <QuantityStepper itemName="Tuna Sambal Matah" quantity={quantity} min={1} max={20} onChange={setQuantity} />
        </div>
      </Section>

      <Section title="Badge status">
        <div className="flex flex-wrap gap-2">
          {(['UNPAID', 'PENDING', 'PAID', 'EXPIRED'] as const).map((status) => (
            <Badge key={status} tone={PAYMENT_STATUS_TONE[status]}>
              {PAYMENT_STATUS_LABEL[status]}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['NEW', 'CONFIRMED', 'SERVED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
            <Badge key={status} tone={ORDER_STATUS_TONE[status]}>
              {ORDER_STATUS_LABEL[status]}
            </Badge>
          ))}
          <Badge tone="danger-solid">Habis</Badge>
          <Badge tone="cream">Promo</Badge>
        </div>
      </Section>

      <Section title="Card (kartu menu)">
        <Card padding="sm" className="flex gap-3">
          <PhotoPlaceholder tone="tuna" className="h-[72px] w-24 shrink-0 rounded-control" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-extrabold">Tuna Sambal Matah</p>
            <p className="truncate text-xs text-muted">Tuna segar dibakar, sambal matah serai.</p>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="font-extrabold whitespace-nowrap text-primary">{formatRupiah(45000)}</span>
              <Button aria-label="Tambah Tuna Sambal Matah">+ Tambah</Button>
            </div>
          </div>
        </Card>
        <Card muted padding="sm" className="flex gap-3">
          <PhotoPlaceholder tone="none" className="h-[72px] w-24 shrink-0 rounded-control" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-extrabold">Ayam Kampung Bakar</p>
            <Badge tone="danger-solid" className="self-start">
              Habis
            </Badge>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="font-extrabold whitespace-nowrap">{formatRupiah(42000)}</span>
              <Button disabled>Habis</Button>
            </div>
          </div>
        </Card>
        <div className="flex gap-2">
          {(['tuna', 'chicken', 'drink', 'none'] as const).map((tone) => (
            <PhotoPlaceholder key={tone} tone={tone} className="size-16 rounded-control" />
          ))}
        </div>
      </Section>

      <Section title="Input">
        <Input label="Nama kamu" hint="Kami panggil nama ini saat pesanan siap" autoComplete="name" defaultValue="Rina" />
        <Input label="No. HP (opsional)" inputMode="tel" defaultValue="0812-34" error="Format no. HP belum benar" />
        <Textarea label="Catatan (opsional)" maxLength={120} placeholder="Contoh: sambal dipisah, tidak pedas" />
      </Section>

      <Section title="Status pesanan">
        <Card>
          <ProgressSteps
            steps={[
              { label: 'Menunggu Pembayaran', state: 'done', time: '12:10' },
              { label: 'Diterima Kasir', state: 'done', time: '12:12' },
              { label: 'Sedang Disiapkan', state: 'current', time: 'Sekarang' },
              { label: 'Disajikan', state: 'todo', time: '—' },
            ]}
          />
        </Card>
      </Section>

      <Section title="Feedback & overlay">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Buka keranjang
          </Button>
          <Button variant="secondary" onClick={() => toast('Ditambahkan ke keranjang')}>
            Tampilkan toast
          </Button>
        </div>
        <Card padding="none">
          <EmptyState
            title="Keranjangmu masih kosong"
            description="Yuk pilih tuna atau ayam kampung favoritmu."
            action={
              <a href="#" className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-primary">
                Lihat menu
              </a>
            }
          />
        </Card>
        <Card padding="none" className="overflow-hidden">
          <ConnectionBanner>Koneksi terputus, memperbarui otomatis…</ConnectionBanner>
          <div className="p-4 text-sm text-muted">Isi halaman tetap tampil.</div>
        </Card>
        <div className="flex items-center justify-center rounded-card bg-surface p-4">
          <Logo variant="green" width={150} />
        </div>
      </Section>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Keranjang"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Total</p>
              <p className="text-lg font-extrabold">{formatRupiah(98000)}</p>
            </div>
            <Button size="lg" onClick={() => setSheetOpen(false)}>
              Lanjut
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-3">
          {['Tuna Sambal Matah × 2', 'Es Teh Serai × 1'].map((item) => (
            <li key={item} className="flex justify-between">
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Textarea label="Catatan untuk dapur" maxLength={120} />
        </div>
      </BottomSheet>
    </main>
  );
}
