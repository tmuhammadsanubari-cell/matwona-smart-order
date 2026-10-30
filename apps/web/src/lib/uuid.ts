/**
 * UUID v4 untuk Idempotency-Key. `crypto.randomUUID` hanya ada di secure context (HTTPS/localhost),
 * sedangkan uji di HP lewat `http://192.168.x.x` bukan secure context → pakai getRandomValues.
 */
export function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // versi 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // varian RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
