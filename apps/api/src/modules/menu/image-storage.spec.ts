import { ErrorCode } from 'shared';
import { AppException } from '../../common/app.exception.js';
import { cloudinarySignature, CloudinaryImageStorage, detectImageType } from './image-storage.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const ENV = { CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '1234', CLOUDINARY_API_SECRET: 'rahasia' };

afterEach(() => vi.unstubAllGlobals());

describe('detectImageType (S2-11)', () => {
  it('mengenali JPEG, PNG, WebP dari magic bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'binary'))).toBe('image/webp');
  });

  it('menolak file lain walau berekstensi gambar (GIF, SVG, teks, kosong)', () => {
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.from('<svg></svg>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('cloudinarySignature', () => {
  it('sesuai contoh resmi dokumentasi Cloudinary (parameter diurutkan, lalu SHA-1 + secret)', () => {
    const signature = cloudinarySignature(
      { timestamp: '1315060510', public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' },
      'abcd',
    );
    expect(signature).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});

describe('CloudinaryImageStorage', () => {
  it('kredensial belum diisi → IMAGE_UPLOAD_FAILED tanpa memanggil jaringan', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const error = await new CloudinaryImageStorage({}).upload({ buffer: PNG, type: 'image/png' }, 'x').catch((e: unknown) => e);
    expect((error as AppException).code).toBe(ErrorCode.IMAGE_UPLOAD_FAILED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upload bertanda tangan ke cloud yang benar dan mengembalikan secure_url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v9/matwona/menu/1.png' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new CloudinaryImageStorage(ENV).upload({ buffer: PNG, type: 'image/png' }, 'matwona/menu/1');

    expect(result.url).toBe('https://res.cloudinary.com/demo/image/upload/v9/matwona/menu/1.png');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    const form = init.body as FormData;
    expect(form.get('api_key')).toBe('1234');
    expect(form.get('public_id')).toBe('matwona/menu/1');
    expect(form.get('overwrite')).toBe('true');
    // Secret tidak pernah dikirim; hanya signature dari parameter yang dikirim.
    expect([...form.values()]).not.toContain('rahasia');
    const signed = Object.fromEntries(
      ['invalidate', 'overwrite', 'public_id', 'timestamp', 'transformation'].map((k) => [k, String(form.get(k))]),
    );
    expect(form.get('signature')).toBe(cloudinarySignature(signed, 'rahasia'));
  });

  it('Cloudinary menolak atau tidak bisa dihubungi → IMAGE_UPLOAD_FAILED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Invalid Signature' } }), { status: 401 })));
    const rejected = await new CloudinaryImageStorage(ENV).upload({ buffer: PNG, type: 'image/png' }, 'x').catch((e: unknown) => e);
    expect((rejected as AppException).code).toBe(ErrorCode.IMAGE_UPLOAD_FAILED);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const offline = await new CloudinaryImageStorage(ENV).upload({ buffer: PNG, type: 'image/png' }, 'x').catch((e: unknown) => e);
    expect(offline).toBeInstanceOf(AppException);
    expect((offline as AppException).code).toBe(ErrorCode.IMAGE_UPLOAD_FAILED);
  });
});
