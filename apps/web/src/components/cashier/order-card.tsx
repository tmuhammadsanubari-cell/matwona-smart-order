import { formatRupiah, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from 'shared';
import type { OrderStatus, StaffOrderDto } from 'shared';
import { Badge, BADGE_TONES, Button, Card, cx } from '@/components/ui';
import { ACTION_LABEL, maskPhone, primaryNextStatus, timeWib } from '@/lib/cashier-board';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/status-tone';

export interface OrderCardProps {
  order: StaffOrderDto;
  /** Pesanan baru masuk: disorot beberapa detik. */
  highlighted?: boolean;
  busy?: boolean;
  onAdvance: (status: OrderStatus) => void;
  onMarkPaid: () => void;
  onCancel: () => void;
  onPrint?: () => void;
}

/** Status yang tidak terbaca dari judul kolom (kolom berisi dua status) → tampilkan badge. */
const SHOW_STATUS_BADGE: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED'];

function PrinterIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Kartu pesanan kasir (PRD 2.2.5, desain K2): meja & nama besar, kode & jam, item + catatan, status bayar,
 * total. Tombol mengikuti `allowedNextStatuses`/`canMarkPaid` dari server (state machine).
 * No. HP disamarkan (NFR-011).
 */
export function OrderCard({ order, highlighted, busy, onAdvance, onMarkPaid, onCancel, onPrint }: OrderCardProps) {
  const next = primaryNextStatus(order);
  const canCancel = order.allowedNextStatuses.includes('CANCELLED');
  const awaitingQris = order.paymentMethod === 'QRIS' && order.paymentStatus !== 'PAID' && order.status === 'NEW';

  return (
    <Card
      role="article"
      aria-label={`Pesanan ${order.orderCode}`}
      className={cx(
        'relative flex flex-col gap-2.5',
        highlighted && 'border-accent ring-4 ring-accent/25 motion-safe:animate-pulse',
      )}
    >
      {highlighted && (
        <Badge tone="danger-solid" className="absolute -top-2.5 right-3.5 tracking-wider">
          BARU
        </Badge>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-2xl leading-none font-extrabold text-primary">Meja {order.table}</p>
          <p className="text-sm font-bold break-words text-ink">{order.customerName}</p>
          {order.customerPhone && <p className="text-xs font-semibold text-muted">{maskPhone(order.customerPhone)}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted">
          <p className="font-bold">{order.orderCode}</p>
          <p className="font-semibold">Masuk {timeWib(order.createdAt)}</p>
          {SHOW_STATUS_BADGE.includes(order.status) && (
            <Badge tone={ORDER_STATUS_TONE[order.status]} className="mt-1">
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 border-y border-dashed border-line py-2.5 text-sm">
        {order.items.map((item, i) => (
          <li key={`${item.menuItemId}-${i}`}>
            <span className="font-bold text-ink">
              {item.quantity}× {item.name}
            </span>
            {item.note && <p className="text-muted italic">Catatan: {item.note}</p>}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cx(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap',
            BADGE_TONES[PAYMENT_STATUS_TONE[order.paymentStatus]],
          )}
        >
          <span>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
          <span>&nbsp;·&nbsp;</span>
          <span>{order.paymentMethod === 'CASHIER' ? 'Bayar di kasir' : 'QRIS'}</span>
        </p>
        <p className="text-base font-extrabold whitespace-nowrap text-ink">{formatRupiah(order.totalAmount)}</p>
      </div>

      {awaitingQris && <p className="text-xs font-semibold text-muted">Pesanan QRIS belum lunas, belum bisa dikonfirmasi.</p>}
      {order.status === 'CANCELLED' && order.cancelReason && (
        <p className="text-sm font-semibold text-danger">Dibatalkan: {order.cancelReason}</p>
      )}

      {(next || order.canMarkPaid || canCancel || onPrint) && (
        // Urutan: aksi utama + cetak/batal selalu sebaris; "Tandai lunas" turun ke baris penuh bila kolom sempit.
        <div className="flex flex-wrap items-center gap-2">
          {next && (
            <Button
              variant={next === 'COMPLETED' ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={() => onAdvance(next)}
              className="flex-1 basis-28 whitespace-nowrap"
            >
              {ACTION_LABEL[next]}
            </Button>
          )}
          {onPrint && (
            <button
              type="button"
              aria-label="Cetak Struk"
              title="Cetak Struk Thermal"
              onClick={onPrint}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-[1.5px] border-line-strong bg-surface text-ink hover:bg-cream hover:border-primary transition-colors"
            >
              <PrinterIcon />
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              aria-label="Batalkan"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-[1.5px] border-danger/40 bg-surface text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CloseIcon />
            </button>
          )}
          {order.canMarkPaid && (
            <Button
              variant={next ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={onMarkPaid}
              className="flex-1 basis-28 whitespace-nowrap"
            >
              Tandai lunas
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
