import { io, type Socket } from 'socket.io-client';
import type { RealtimeHandshakeAuth } from 'shared';
import { resolveDevUrl } from './dev-url';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000/realtime';

/**
 * Koneksi ke gateway `/realtime` (PRD 4.3). Pelanggan: `auth: { tableToken, orderCode }`;
 * staf: cookie sesi (`withCredentials`). Reconnect otomatis oleh socket.io-client.
 */
export function connectRealtime(auth: RealtimeHandshakeAuth = {}): Socket {
  return io(resolveDevUrl(SOCKET_URL), { auth, withCredentials: true, transports: ['websocket', 'polling'] });
}
