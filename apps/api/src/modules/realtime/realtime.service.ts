import { Injectable, Logger } from '@nestjs/common';
import { SocketEvent, socketRoom } from 'shared';
import type { OrderCreatedEvent, OrderUpdatedEvent, PaymentUpdatedEvent, StaffOrderDto } from 'shared';
import type { Namespace } from 'socket.io';

/**
 * Pemancar event realtime (FR-007, FR-008, NFR-002). Dipanggil setelah transaksi DB commit.
 * Kegagalan emit hanya dicatat: request HTTP tidak boleh gagal karena WebSocket.
 * Room kasir menerima DTO staf lengkap; room pesanan pelanggan hanya status (tanpa data pribadi).
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private server?: Namespace;

  /** Dipanggil RealtimeGateway setelah namespace siap. */
  attach(server: Namespace) {
    this.server = server;
  }

  orderCreated(outletId: string, order: StaffOrderDto) {
    this.emit(socketRoom.cashier(outletId), SocketEvent.ORDER_CREATED, order satisfies OrderCreatedEvent);
  }

  orderUpdated(outletId: string, order: StaffOrderDto) {
    const event: OrderUpdatedEvent = { orderCode: order.orderCode, status: order.status };
    this.emit(socketRoom.cashier(outletId), SocketEvent.ORDER_UPDATED, { ...event, order });
    this.emit(socketRoom.order(order.orderCode), SocketEvent.ORDER_UPDATED, event);
  }

  paymentUpdated(outletId: string, order: StaffOrderDto) {
    const event: PaymentUpdatedEvent = { orderCode: order.orderCode, paymentStatus: order.paymentStatus };
    this.emit(socketRoom.cashier(outletId), SocketEvent.PAYMENT_UPDATED, { ...event, order });
    this.emit(socketRoom.order(order.orderCode), SocketEvent.PAYMENT_UPDATED, event);
  }

  private emit(room: string, event: SocketEvent, payload: unknown) {
    if (!this.server) return;
    try {
      this.server.to(room).emit(event, payload);
    } catch (error) {
      this.logger.warn(`Gagal memancarkan ${event} ke ${room}: ${(error as Error)?.message ?? error}`);
    }
  }
}
