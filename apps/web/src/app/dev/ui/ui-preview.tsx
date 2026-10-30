'use client';

import { useState } from 'react';
import { formatRupiah, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from 'shared';
import { Badge, BottomSheet, Button, Card, Input, Textarea } from '@/components/ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function UiPreview() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 p-4 pb-24">
      <header className="-mx-4 -mt-4 bg-primary px-4 py-3 text-primary-foreground">
        <p className="text-lg font-bold">UI kit Matwona</p>
        <p className="text-sm text-cream">Cek di lebar 360 px (DevTools → responsive).</p>
      </header>

      <Section title="Button">
        <Button fullWidth size="lg">
          Pesan Sekarang
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Batalkan</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? 'Mengirim…' : 'Coba loading'}
          </Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>{ORDER_STATUS_LABEL.NEW}</Badge>
          <Badge tone="primary">{ORDER_STATUS_LABEL.CONFIRMED}</Badge>
          <Badge tone="success">{PAYMENT_STATUS_LABEL.PAID}</Badge>
          <Badge tone="danger">{PAYMENT_STATUS_LABEL.UNPAID}</Badge>
          <Badge tone="danger">Habis</Badge>
          <Badge tone="cream">Promo</Badge>
        </div>
      </Section>

      <Section title="Card (kartu menu)">
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Tuna Sambal Matah</p>
            <p className="text-sm text-muted">Tuna segar, sambal matah, nasi hangat.</p>
            <p className="mt-1 font-bold text-primary">{formatRupiah(45000)}</p>
          </div>
          <Button aria-label="Tambah Tuna Sambal Matah">Tambah</Button>
        </Card>
        <Card muted className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Ayam Kampung Bakar</p>
            <Badge tone="danger">Habis</Badge>
          </div>
          <Button disabled>Tambah</Button>
        </Card>
      </Section>

      <Section title="Input">
        <Input label="Nama" placeholder="Untuk dipanggil saat pesanan siap" autoComplete="name" />
        <Input label="No. HP" hint="Opsional" inputMode="tel" defaultValue="12345" error="Format no. HP tidak valid" />
        <Textarea label="Catatan" hint="Maks. 120 karakter" maxLength={120} placeholder="mis. sambal dipisah" />
      </Section>

      <Section title="BottomSheet">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Buka keranjang
        </Button>
      </Section>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Keranjang"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Total</p>
              <p className="text-lg font-bold">{formatRupiah(98000)}</p>
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
