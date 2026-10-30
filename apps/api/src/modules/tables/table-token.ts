import { randomBytes } from 'node:crypto';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** 2^128 butuh maksimal 22 digit base62; token selalu dipad ke panjang ini. */
const TOKEN_LENGTH = 22;

export const TABLE_TOKEN_PATTERN = /^[0-9A-Za-z]{22}$/;

/** Token QR meja acak 128-bit base62 (NFR-010). Dipakai juga oleh prisma/seed.ts. */
export function generateTableToken(): string {
  let n = BigInt('0x' + randomBytes(16).toString('hex'));
  let out = '';
  while (n > 0n) {
    out = BASE62[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out.padStart(TOKEN_LENGTH, '0');
}
