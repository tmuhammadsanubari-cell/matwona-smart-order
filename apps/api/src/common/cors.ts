/** Origin web lokal default bila WEB_ORIGIN tidak di-set. */
const DEFAULT_ORIGINS = ['http://localhost:3000'];

/** HP di jaringan lokal (Wi-Fi/hotspot laptop) yang membuka `next dev` lewat IP laptop. */
const DEV_LAN_ORIGIN = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/;

/**
 * Origin yang boleh memanggil API (CORS HTTP & Socket.IO). Produksi hanya `WEB_ORIGIN` (dipisah koma);
 * di luar produksi juga origin LAN `192.168.*.*:3000` agar web bisa diuji di HP tanpa mengubah .env.
 * Request tanpa header Origin (curl, server-to-server) selalu diizinkan.
 */
export function isAllowedOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return true;
  const allowed = env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? DEFAULT_ORIGINS;
  if (allowed.includes(origin)) return true;
  return env.NODE_ENV !== 'production' && DEV_LAN_ORIGIN.test(origin);
}

/** Bentuk callback yang dipakai `cors` (Express) maupun opsi `cors` Socket.IO. */
export const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>
  callback(null, isAllowedOrigin(origin));
