import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { MenuImageType } from 'shared';
import { AppException } from '../../common/app.exception.js';

/** Penyimpanan foto menu (FR-010, S2-11). Diganti versi palsu di test agar tidak memanggil Cloudinary. */
export interface ImageStorage {
  /** Simpan/timpa foto dengan id tetap; mengembalikan URL publik (HTTPS). */
  upload(file: { buffer: Buffer; type: MenuImageType }, publicId: string): Promise<{ url: string }>;
}

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

/**
 * Jenis gambar dari isi file (magic bytes), bukan dari Content-Type klien yang bisa dipalsukan.
 * JPEG FF D8 FF · PNG 89 50 4E 47 0D 0A 1A 0A · WebP "RIFF" .... "WEBP".
 */
export function detectImageType(buffer: Buffer): MenuImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/**
 * Signature upload Cloudinary: SHA-1 dari parameter (urut abjad, `k=v` digabung `&`) + API secret.
 * `file`, `api_key`, `resource_type`, `cloud_name` tidak ikut ditandatangani.
 * https://cloudinary.com/documentation/authentication_signatures
 */
export function cloudinarySignature(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + apiSecret).digest('hex');
}

const UPLOAD_TIMEOUT_MS = 15_000;
/** Foto asli dibatasi 1600 px sisi terpanjang saat disimpan; tampilan memakai transformasi per ukuran. */
const INCOMING_TRANSFORMATION = 'c_limit,h_1600,w_1600';

/**
 * Upload bertanda tangan ke Cloudinary lewat REST API (tanpa SDK). Kredensial dari CLOUDINARY_* di .env.
 * Didaftarkan lewat useFactory (MenuModule), bukan DI kelas, karena constructor menerima env untuk test.
 */
export class CloudinaryImageStorage implements ImageStorage {
  private readonly logger = new Logger('Cloudinary');

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async upload(file: { buffer: Buffer; type: MenuImageType }, publicId: string): Promise<{ url: string }> {
    const cloudName = this.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = this.env.CLOUDINARY_API_KEY;
    const apiSecret = this.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, 'Penyimpanan foto belum dikonfigurasi. Hubungi pengelola sistem.');
    }

    // invalidate: CDN membuang versi lama; URL baru juga memuat nomor versi sehingga browser memuat ulang.
    const params = {
      invalidate: 'true',
      overwrite: 'true',
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      transformation: INCOMING_TRANSFORMATION,
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.append(key, value);
    form.append('api_key', apiKey);
    form.append('signature', cloudinarySignature(params, apiSecret));
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.type }));

    let res: Response;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Upload ${publicId} gagal terhubung`, error instanceof Error ? error.message : error);
      throw this.failed();
    }
    const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
    if (!res.ok || !body?.secure_url) {
      this.logger.error(`Upload ${publicId} ditolak (${res.status}): ${body?.error?.message ?? 'tanpa pesan'}`);
      throw this.failed();
    }
    return { url: body.secure_url };
  }

  private failed() {
    return new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, 'Foto belum bisa diunggah. Coba lagi beberapa saat lagi.');
  }
}
