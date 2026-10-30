import { Inject, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { ErrorCode, REALTIME_NAMESPACE } from 'shared';
import type { Namespace, Socket } from 'socket.io';
import { AppException } from '../../common/app.exception.js';
import { corsOrigin } from '../../common/cors.js';
import { RealtimeAuthService } from './realtime-auth.service.js';
import { RealtimeService } from './realtime.service.js';

/** Error handshake Socket.IO; `data` diteruskan ke klien di `connect_error`. */
type ExtendedError = Error & { data?: { code: string } };

interface SocketData {
  rooms: string[];
}

/**
 * Gateway Socket.IO `/realtime` (PRD 4.3). Klien hanya menerima event dari server;
 * autentikasi dilakukan sekali di handshake, gagal → `connect_error` dengan `data.code`.
 * Origin sama dengan CORS HTTP (`common/cors.ts`), dibaca saat request setelah env dimuat ConfigModule.
 */
@WebSocketGateway({ namespace: REALTIME_NAMESPACE, cors: { origin: corsOrigin, credentials: true } })
export class RealtimeGateway implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket> {
  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    @Inject(RealtimeAuthService) private readonly auth: RealtimeAuthService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      this.auth
        .authorize(socket.handshake)
        .then((rooms) => {
          (socket.data as SocketData).rooms = rooms;
          next();
        })
        .catch((error: unknown) => next(toConnectError(error)));
    });
    this.realtime.attach(server);
  }

  async handleConnection(socket: Socket) {
    await socket.join((socket.data as SocketData).rooms);
    this.logger.debug(`Terhubung ${socket.id} → ${(socket.data as SocketData).rooms.join(', ')}`);
  }
}

function toConnectError(error: unknown): ExtendedError {
  const known = error instanceof AppException;
  const err: ExtendedError = new Error(known ? error.message : 'Gagal menyambung ke server realtime.');
  err.data = { code: known ? error.code : ErrorCode.INTERNAL_ERROR };
  return err;
}
