'use client';

import { useState } from 'react';
import { formatRupiah } from 'shared';
import type { StaffOrderDto } from 'shared';
import { Button } from '@/components/ui';

export interface ThermalReceiptProps {
  order: StaffOrderDto;
  onClose: () => void;
}

/**
 * Komponen Struk Kasir Thermal (58mm / 80mm) Matwona
 * Mendukung cetak langsung via browser dialog (kompatibel semua printer thermal USB/BT)
 * dan render ESC/POS.
 */
export function ThermalReceiptModal({ order, onClose }: ThermalReceiptProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const receiptPlainText = [
    '================================',
    '            MATWONA             ',
    'Two worlds. One table. Simply, makan.',
    '    Jl. Matwona No. 12, Bandung ',
    '================================',
    `Order  : ${order.orderCode}`,
    `Meja   : ${order.table}`,
    `Kasir  : Kasir Matwona`,
    `Tgl    : ${new Date(order.createdAt).toLocaleString('id-ID')}`,
    `Nama   : ${order.customerName}`,
    '--------------------------------',
    ...order.items.map(
      (it) =>
        `${it.quantity}x ${it.name}\n   @${formatRupiah(it.unitPrice)} = ${formatRupiah(it.lineTotal)}` +
        (it.note ? `\n   (Catatan: ${it.note})` : ''),
    ),
    '--------------------------------',
    `Subtotal   : ${formatRupiah(order.subtotalAmount)}`,
    order.discountAmount > 0 ? `Diskon     : -${formatRupiah(order.discountAmount)}` : '',
    `TOTAL      : ${formatRupiah(order.totalAmount)}`,
    `Pembayaran : ${order.paymentMethod === 'CASHIER' ? 'KASIR' : 'QRIS'} (${order.paymentStatus})`,
    '================================',
    ' Terima Kasih Atas Kunjungan Anda ',
    '       Selamat Menikmati!       ',
    '================================',
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptPlainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-2xl bg-surface shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#106F4D" strokeWidth="2" aria-hidden="true">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            <h3 className="font-extrabold text-ink">Cetak Struk Kasir</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-cream"
          >
            ✕
          </button>
        </div>

        {/* Thermal Receipt Paper Preview */}
        <div className="overflow-y-auto p-5">
          <div
            id="thermal-receipt-paper"
            className="mx-auto w-[280px] rounded-lg border border-line-strong bg-white p-4 font-mono text-xs text-black shadow-inner"
          >
            <div className="text-center font-bold">
              <div className="text-sm font-black tracking-wider">MATWONA</div>
              <div className="text-[10px] text-gray-600">Two worlds. One table. Simply, makan.</div>
              <div className="text-[10px] text-gray-500">Jl. Matwona No. 12, Bandung</div>
              <div className="my-1.5 border-b border-dashed border-gray-400" />
            </div>

            <div className="flex flex-col gap-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>No Order:</span>
                <span className="font-bold">{order.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Meja:</span>
                <span className="font-bold">Meja {order.table}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold">{order.customerName}</span>
              </div>
            </div>

            <div className="my-1.5 border-b border-dashed border-gray-400" />

            {/* Items */}
            <div className="flex flex-col gap-1.5 py-1 text-[11px]">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-bold">{formatRupiah(it.lineTotal)}</span>
                  </div>
                  {it.note && <span className="text-[10px] italic text-gray-500">Note: {it.note}</span>}
                </div>
              ))}
            </div>

            <div className="my-1.5 border-b border-dashed border-gray-400" />

            {/* Total */}
            <div className="flex flex-col gap-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-xs font-black">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between pt-0.5 text-[10px] text-gray-600">
                <span>Metode:</span>
                <span className="font-bold uppercase">{order.paymentMethod === 'CASHIER' ? 'Bayar di Kasir' : 'QRIS'}</span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-gray-400" />

            <div className="text-center text-[10px] text-gray-600">
              <div>Terima kasih atas kunjungan Anda</div>
              <div className="font-semibold">Selamat Menikmati!</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-line bg-[#FAFAF0] p-4">
          <Button variant="secondary" onClick={handleCopy} className="text-xs">
            {copied ? '✓ Disalin' : 'Salin Teks'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} className="text-xs">
              Tutup
            </Button>
            <Button onClick={handlePrint} className="gap-1.5 text-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" rx="1" />
              </svg>
              <span>Cetak Struk</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
