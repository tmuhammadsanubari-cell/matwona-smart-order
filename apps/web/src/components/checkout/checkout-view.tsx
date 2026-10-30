'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createOrderSchema, ErrorCode, formatRupiah } from 'shared';
import type { PaymentMethod, PublicMenu, PublicMenuItem } from 'shared';
import { Button, buttonClassName, Card, cx, Input } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { placeOrder } from '@/lib/place-order';
import { rememberOrder } from '@/lib/placed-orders';
import { uuidV4 } from '@/lib/uuid';
import { loadCartForTable, summarizeCart, useCart } from '@/stores/cart';

const customerSchema = createOrderSchema.pick({ customerName: true, customerPhone: true });

type FieldErrors = Partial<Record<'customerName' | 'customerPhone', string>>;

interface ItemProblem {
  menuItemId: string;
  name: string | null;
  unitPrice?: number;
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; description: string; disabled?: boolean }[] = [
  { value: 'CASHIER', label: 'Bayar di kasir', description: 'Tunai, debit, atau QRIS outlet setelah pesanan dikirim.' },
  // QRIS online (Midtrans) menyusul di S2-01/S2-03.
  { value: 'QRIS', label: 'QRIS dari HP', description: 'Segera tersedia.', disabled: true },
];

export interface CheckoutViewProps {
  token: string;
  outletSlug: string;
  tableLabel: string;
  menu: PublicMenu;
}

const namesOf = (items: ItemProblem[]) => items.map((i) => i.name ?? 'Menu').join(', ');

/** Checkout tamu (FR-004, FR-006): nama, no. HP opsional, metode bayar, kirim pesanan. */
export function CheckoutView({ token, outletSlug, tableLabel, menu }: CheckoutViewProps) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASHIER');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Satu kunci per halaman checkout: kirim ulang setelah gagal/timeout tidak membuat pesanan ganda.
  const idempotencyKey = useRef<string | null>(null);

  const menuItems = useMemo(
    () => new Map<string, PublicMenuItem>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const))),
    [menu.categories],
  );
  const summary = summarizeCart(ready ? lines : [], menuItems);
  const menuHref = `/m/${outletSlug}/t/${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    void loadCartForTable(token).then(() => {
      if (cancelled) return;
      useCart.getState().syncWithMenu(menuItems);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [token, menuItems]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = customerSchema.safeParse({ customerName: name, customerPhone: phone });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    idempotencyKey.current ??= uuidV4();
    try {
      const order = await placeOrder({
        tableToken: token,
        idempotencyKey: idempotencyKey.current,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        paymentMethod: method,
        lines: useCart.getState().lines,
      });
      rememberOrder({ code: order.orderCode, outlet: outletSlug, tableToken: token, createdAt: order.createdAt });
      useCart.getState().clear();
      router.replace(`/m/${outletSlug}/order/${order.orderCode}`);
    } catch (error) {
      setSubmitting(false);
      handleError(error);
    }
  }

  function handleError(error: unknown) {
    if (!(error instanceof ApiClientError)) {
      setFormError('Gagal mengirim pesanan. Periksa koneksi lalu coba lagi.');
      return;
    }
    const items = (error.error.details as { items?: ItemProblem[] } | undefined)?.items ?? [];
    switch (error.error.code) {
      case ErrorCode.ITEM_UNAVAILABLE:
        useCart.getState().remove(items.map((i) => i.menuItemId));
        setFormError(`${namesOf(items)} baru saja habis dan sudah dihapus dari pesanan. Periksa lagi lalu kirim.`);
        return;
      case ErrorCode.PRICE_CHANGED:
        useCart.getState().updatePrices(items.flatMap((i) => (i.unitPrice === undefined ? [] : [{ menuItemId: i.menuItemId, unitPrice: i.unitPrice }])));
        setFormError(`Harga ${namesOf(items)} berubah. Total sudah diperbarui, periksa lalu kirim lagi.`);
        return;
      case ErrorCode.VALIDATION_ERROR: {
        const fields = (error.error.details as { fields?: { path: string; message: string }[] } | undefined)?.fields ?? [];
        const errors: FieldErrors = {};
        for (const f of fields) if (f.path === 'customerName' || f.path === 'customerPhone') errors[f.path] = f.message;
        setFieldErrors(errors);
        if (Object.keys(errors).length === 0) setFormError(error.message);
        return;
      }
      default:
        setFormError(error.message);
    }
  }

  if (ready && lines.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-ink">Keranjangmu masih kosong</h1>
        <p className="text-muted">Pilih menu dulu, lalu kembali ke sini untuk memesan.</p>
        <Link href={menuHref} className={buttonClassName({ size: 'lg' })}>
          Lihat menu
        </Link>
      </main>
    );
  }

  const blocked = summary.unavailable.length > 0;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-36">
      <header className="bg-primary px-4 pt-3 pb-5 text-primary-foreground">
        <Link href={menuHref} className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm text-cream">
          ← Kembali ke menu
        </Link>
        <h1 className="text-2xl font-bold">Checkout · Meja {tableLabel}</h1>
      </header>

      <form id="checkout" noValidate onSubmit={submit} className="flex flex-col gap-4 p-4">
        <Card>
          <h2 className="mb-2 font-bold text-ink">Pesananmu</h2>
          <ul className="flex flex-col gap-2">
            {lines.map((line) => {
              const available = menuItems.get(line.menuItemId)?.isAvailable === true;
              return (
                <li key={line.menuItemId} className="flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className={cx('font-semibold', available ? 'text-ink' : 'text-muted line-through')}>
                      {line.name} × {line.quantity}
                    </p>
                    {line.note && <p className="text-muted">Catatan: {line.note}</p>}
                    {!available && <p className="text-danger">Habis</p>}
                  </div>
                  <p className="shrink-0 font-semibold">{available ? formatRupiah(line.unitPrice * line.quantity) : '–'}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd>{formatRupiah(summary.subtotal)}</dd>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Diskon promo</dt>
                <dd>−{formatRupiah(summary.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-ink">
              <dt>Total</dt>
              <dd>{formatRupiah(summary.total)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold text-ink">Data pemesan</h2>
          <Input
            label="Nama"
            hint="Untuk memanggilmu saat pesanan siap."
            autoComplete="name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.customerName}
          />
          <Input
            label="No. HP"
            hint="Opsional, mis. 0812xxxxxxxx."
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors.customerPhone}
          />
        </Card>

        <Card>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-bold text-ink">Metode pembayaran</legend>
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cx(
                  'flex min-h-11 items-start gap-3 rounded-xl border-2 p-3',
                  option.disabled ? 'cursor-not-allowed border-line text-muted' : 'cursor-pointer',
                  !option.disabled && method === option.value ? 'border-primary bg-primary-soft' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={method === option.value}
                  disabled={option.disabled}
                  onChange={() => setMethod(option.value)}
                  className="mt-1 size-5 accent-primary"
                />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-sm text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </Card>

        {(formError || blocked) && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {formError ?? 'Ada menu yang sudah habis. Kembali ke menu untuk menghapusnya dari keranjang.'}
          </p>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="text-sm text-muted">Total</p>
            <p className="text-lg font-bold text-ink">{formatRupiah(summary.total)}</p>
          </div>
          <Button type="submit" form="checkout" size="lg" loading={submitting} disabled={!ready || blocked}>
            {submitting ? 'Mengirim…' : 'Kirim pesanan'}
          </Button>
        </div>
      </div>
    </main>
  );
}
