import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { allowedNextStatuses, assertTransition, OrderStateSnapshot } from './order-status.machine.js';

const order = (overrides: Partial<OrderStateSnapshot> = {}): OrderStateSnapshot => ({
  status: 'NEW',
  paymentMethod: 'CASHIER',
  paymentStatus: 'UNPAID',
  ...overrides,
});

const codeOf = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    return (e as AppException).code;
  }
  return undefined;
};

describe('order status machine [FR-008]', () => {
  it('mengizinkan pesanan bayar di kasir dikonfirmasi walau belum lunas', () => {
    expect(() => assertTransition(order(), 'CONFIRMED')).not.toThrow();
  });

  it('menolak konfirmasi pesanan QRIS yang belum lunas', () => {
    expect(codeOf(() => assertTransition(order({ paymentMethod: 'QRIS', paymentStatus: 'PENDING' }), 'CONFIRMED'))).toBe(
      ErrorCode.PAYMENT_NOT_COMPLETED,
    );
  });

  it('mengizinkan konfirmasi pesanan QRIS yang sudah lunas', () => {
    expect(() => assertTransition(order({ paymentMethod: 'QRIS', paymentStatus: 'PAID' }), 'CONFIRMED')).not.toThrow();
  });

  it('menolak lompatan status NEW → SERVED', () => {
    expect(codeOf(() => assertTransition(order(), 'SERVED'))).toBe(ErrorCode.INVALID_STATUS_TRANSITION);
  });

  it('menolak menyelesaikan pesanan yang belum lunas', () => {
    expect(codeOf(() => assertTransition(order({ status: 'SERVED' }), 'COMPLETED'))).toBe(
      ErrorCode.PAYMENT_NOT_COMPLETED,
    );
  });

  it('tidak bisa membatalkan pesanan yang sedang disiapkan', () => {
    expect(codeOf(() => assertTransition(order({ status: 'PREPARING' }), 'CANCELLED'))).toBe(
      ErrorCode.INVALID_STATUS_TRANSITION,
    );
  });

  it('status akhir tidak punya transisi', () => {
    expect(allowedNextStatuses(order({ status: 'COMPLETED', paymentStatus: 'PAID' }))).toEqual([]);
    expect(allowedNextStatuses(order({ status: 'CANCELLED' }))).toEqual([]);
  });
});
