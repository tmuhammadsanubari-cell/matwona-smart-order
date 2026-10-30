import type { ImageLoaderProps } from 'next/image';

/**
 * Loader next/image untuk foto menu di Cloudinary (PRD 2.2.1): transformasi dilakukan Cloudinary
 * (`w_<lebar>,f_auto,q_auto`), bukan server Next. URL selain Cloudinary dikembalikan apa adanya.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const marker = '/image/upload/';
  const at = src.indexOf(marker);
  if (!src.startsWith('https://res.cloudinary.com/') || at === -1) return src;
  const transform = `w_${width},f_auto,q_${quality ?? 'auto'}`;
  return `${src.slice(0, at + marker.length)}${transform}/${src.slice(at + marker.length)}`;
}
