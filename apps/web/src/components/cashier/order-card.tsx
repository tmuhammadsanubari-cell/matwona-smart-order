import { formatRupiah, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from 'shared';
import type { OrderStatus, StaffOrderDto } from 'shared';
import { Badge, Button, Card, cx } from '@/components/ui';
import { ACTION_LABEL, primaryNextStatus, timeWib } from '@/lib/cashier-board';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/status-tone';

export interface OrderCardProps {
  order: StaffOrderDto;
  /** Pesanan baru masuk: disorot beberapa detik. */
  highlighted?: boolean;
  busy?: boolean;
  onAdvance: (status: OrderStatus) => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}

/**
 * Kartu pesanan kasir (PRD 2.2.5): kode, meja, nama, item + catatan, total, metode & status bayar,
 * waktu masuk. Tombol mengikuti `allowedNextStatuses`/`canMarkPaid` dari server (state machine).
 */
export function OrderCard({ order, highlighted, busy, onAdvance, onMarkPaid, onCancel }: OrderCardProps) {
  const next = primaryNextStatus(order);
  const canCancel = order.allowedNextStatuses.includes('CANCELLED');
  const awaitingQris = order.paymentMethod === 'QRIS' && order.paymentStatus !== 'PAID' && order.status === 'NEW';

  return (
    <Card
      role="article"
      aria-label={`Pesanan ${order.orderCode}`}
      className={cx('flex flex-col gap-3', highlighted && 'ring-4 ring-accent motion-safe:animate-pulse')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink">{order.orderCode}</p>
          <p className="text-sm text-muted">
            Masuk {timeWib(order.createdAt)} · <span className="font-semibold text-ink">Meja {order.table}</span>
          </p>
        </div>
        <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
      </div>

      <p className="text-sm">
        <span className="text-muted">Atas nama </span>
        <span className="font-semibold text-ink">{order.customerName}</span>
        {order.customerPhone && <span className="text-muted"> · {order.customerPhone}</span>}
      </p>

      <ul className="flex flex-col gap-1 border-y border-line py-2 text-sm">
        {order.items.map((item, i) => (
          <li key={`${item.menuItemId}-${i}`}>
            <span className="font-semibold text-ink">
              {item.quantity}× {item.name}
            </span>
            {item.note && <p className="text-muted">Catatan: {item.note}</p>}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="font-bold whitespace-nowrap text-ink">{formatRupiah(order.totalAmount)}</p>
        <p className="flex items-center gap-2 text-sm whitespace-nowrap text-muted">
          {order.paymentMethod === 'CASHIER' ? 'Bayar di kasir' : 'QRIS'}
          <Badge tone={PAYMENT_STATUS_TONE[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
        </p>
      </div>

      {awaitingQris && <p className="text-sm text-muted">Menunggu pembayaran QRIS sebelum bisa diproses.</p>}
      {order.status === 'CANCELLED' && order.cancelReason && (
        <p className="text-sm text-danger">Dibatalkan: {order.cancelReason}</p>
      )}

      {(next || order.canMarkPaid || canCancel) && (
        <div className="flex flex-wrap gap-2">
          {order.canMarkPaid && (
            <Button variant={next ? 'secondary' : 'primary'} disabled={busy} onClick={onMarkPaid}>
              Tandai lunas
            </Button>
          )}
          {next && (
            <Button disabled={busy} onClick={() => onAdvance(next)}>
              {ACTION_LABEL[next]}
            </Button>
          )}
          {canCancel && (
            <Button variant="danger-ghost" disabled={busy} onClick={onCancel}>
              Batalkan
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
