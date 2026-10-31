'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createOrderSchema, ErrorCode, formatRupiah } from 'shared';
import type { PaymentMethod, PublicMenu, PublicMenuItem } from 'shared';
import { Button, buttonClassName, Card, cx, EmptyState, Input } from '@/components/ui';
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

function CashierIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="9" rx="2" />
      <path d="M6 11V5h8v6M17 8h2M7 15h4M15 15h2" />
    </svg>
  );
}

function QrisIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: () => React.JSX.Element;
  disabled?: boolean;
}[] = [
  {
    value: 'CASHIER',
    label: 'Bayar di Kasir',
    description: 'Tunai, kartu, atau QRIS outlet di kasir setelah pesanan dikirim.',
    icon: CashierIcon,
  },
  // QRIS online (Midtrans) menyusul di S2-01/S2-03.
  { value: 'QRIS', label: 'QRIS', description: 'Bayar dari meja pakai e-wallet atau m-banking. Segera tersedia.', icon: QrisIcon, disabled: true },
];

/** Langkah alur pelanggan: menu → keranjang → checkout → status (desain C4). */
const FLOW_STEP = 3;
const FLOW_STEPS = 4;

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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6">
        <EmptyState
          title="Keranjangmu masih kosong"
          description="Pilih menu dulu, lalu kembali ke sini untuk memesan."
          action={
            <Link href={menuHref} className={buttonClassName({ size: 'lg' })}>
              Lihat menu
            </Link>
          }
        />
      </main>
    );
  }

  const blocked = summary.unavailable.length > 0;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-40">
      <header className="flex h-16 items-center justify-between gap-2 border-b border-line pr-4 pl-2">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={menuHref}
            aria-label="Kembali ke menu"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-line"
          >
            <BackIcon />
          </Link>
          <div className="flex min-w-0 flex-col">
            <h1 className="text-lg leading-tight font-extrabold text-ink">Checkout</h1>
            <p className="text-xs font-semibold text-muted">Meja {tableLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" aria-label={`Langkah ${FLOW_STEP} dari ${FLOW_STEPS}`} role="img">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: FLOW_STEPS }, (_, i) => (
              <span key={i} className={cx('h-1 w-4 rounded-full', i < FLOW_STEP ? 'bg-primary' : 'bg-line-strong')} />
            ))}
          </div>
          <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
            {FLOW_STEP}/{FLOW_STEPS}
          </span>
        </div>
      </header>

      <form id="checkout" noValidate onSubmit={submit} className="flex flex-col gap-5 px-4 py-5">
        <Input
          label="Nama kamu"
          hint="Kami panggil nama ini saat pesanan siap."
          autoComplete="name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.customerName}
        />
        <Input
          label="No. HP (opsional)"
          placeholder="08xxxxxxxxxx"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldErrors.customerPhone}
        />

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-bold text-ink">Metode pembayaran</legend>
          {PAYMENT_OPTIONS.map((option) => {
            const selected = !option.disabled && method === option.value;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={cx(
                  'flex items-start gap-3.5 rounded-card bg-surface p-4',
                  option.disabled ? 'cursor-not-allowed border-[1.5px] border-line' : 'cursor-pointer',
                  selected && 'border-2 border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
                  !option.disabled && !selected && 'border-[1.5px] border-line',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={method === option.value}
                  disabled={option.disabled}
                  onChange={() => setMethod(option.value)}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                />
                <span
                  className={cx(
                    'flex size-11 shrink-0 items-center justify-center rounded-control',
                    selected ? 'bg-primary-soft text-primary' : 'bg-neutral-soft text-muted',
                  )}
                >
                  <Icon />
                </span>
                <span className="flex flex-col gap-1">
                  <span className={cx('text-base font-extrabold', option.disabled ? 'text-muted' : 'text-ink')}>
                    {option.label}
                  </span>
                  <span className="text-[13px] leading-snug text-muted">{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <Card padding="none" className="overflow-hidden">
          <details open className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="text-[15px] font-extrabold text-ink">Ringkasan pesanan · {summary.itemCount} item</span>
              <span className="flex items-center gap-1.5 font-extrabold whitespace-nowrap text-ink">
                {formatRupiah(summary.total)}
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="transition-transform group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </summary>
            <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
              <ul className="flex flex-col gap-2">
                {lines.map((line) => {
                  const available = menuItems.get(line.menuItemId)?.isAvailable === true;
                  return (
                    <li key={line.menuItemId} className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cx(available ? 'text-ink' : 'text-muted line-through')}>
                          {line.quantity}× {line.name}
                        </p>
                        {line.note && <p className="text-xs break-words text-muted italic">Catatan: {line.note}</p>}
                        {!available && <p className="text-xs font-extrabold text-danger">Habis</p>}
                      </div>
                      <p className="shrink-0 font-bold whitespace-nowrap">
                        {available ? formatRupiah(line.unitPrice * line.quantity) : '–'}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-1 flex flex-col gap-1.5 border-t border-line pt-3">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-bold">{formatRupiah(summary.subtotal)}</dd>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Diskon promo</dt>
                    <dd className="font-bold text-primary">−{formatRupiah(summary.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <dt className="font-extrabold">Total</dt>
                  <dd className="font-extrabold">{formatRupiah(summary.total)}</dd>
                </div>
              </dl>
            </div>
          </details>
        </Card>

        {(formError || blocked) && (
          <p
            role="alert"
            className="rounded-control border border-danger/30 bg-danger-soft p-3 text-sm leading-snug font-semibold text-danger-strong"
          >
            {formError ?? 'Ada menu yang sudah habis. Kembali ke menu untuk menghapusnya dari keranjang.'}
          </p>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button type="submit" form="checkout" size="lg" fullWidth loading={submitting} disabled={!ready || blocked}>
            {submitting ? 'Mengirim pesanan…' : `Pesan Sekarang · ${formatRupiah(summary.total)}`}
          </Button>
          <p className="text-xs font-semibold text-muted">Harga dicek ulang saat pesanan dikirim</p>
        </div>
      </div>
    </main>
  );
}
