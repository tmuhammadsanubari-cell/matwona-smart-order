'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { MENU_IMAGE_TYPES } from 'shared';
import type { MenuItemDto } from 'shared';
import { MenuPhoto } from '@/components/menu/menu-item-card';
import { Button, cx } from '@/components/ui';
import { ApiClientError } from '@/lib/api';
import { menuImageError } from '@/lib/menu-form';
import { useMenuAdminMutations } from './use-menu-admin';

function UploadIcon() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
    </svg>
  );
}

/**
 * Foto menu di form ubah menu (FR-010, S2-11; desain A2): area unggah 4:3 dengan pratinjau. Foto langsung
 * diunggah saat dipilih (tidak menunggu "Simpan") karena disimpan per item di Cloudinary.
 */
export function MenuPhotoField({ item }: { item: MenuItemDto }) {
  const { uploadImage, removeImage } = useMenuAdminMutations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [error, setError] = useState<string | null>(null);
  const busy = uploadImage.isPending || removeImage.isPending;

  const onError = (e: unknown) =>
    setError(e instanceof ApiClientError ? e.message : 'Foto belum bisa diunggah. Periksa koneksi lalu coba lagi.');

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Kosongkan agar memilih file yang sama lagi tetap memicu change.
    event.target.value = '';
    if (!file) return;
    const problem = menuImageError(file);
    if (problem) return setError(problem);
    setError(null);
    uploadImage.mutate({ id: item.id, file }, { onSuccess: (dto) => setImageUrl(dto.imageUrl), onError });
  };

  const remove = () => {
    setError(null);
    removeImage.mutate(item.id, { onSuccess: (dto) => setImageUrl(dto.imageUrl), onError });
  };

  return (
    <div className="flex flex-col gap-2" aria-busy={busy || undefined}>
      <span className="text-sm font-bold text-ink">Foto menu</span>
      <label
        className={cx(
          'relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-card text-center',
          imageUrl ? 'border border-line' : 'border-2 border-dashed border-primary/40 bg-primary-soft/50 p-3',
          'focus-within:outline-3 focus-within:outline-accent',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={MENU_IMAGE_TYPES.join(',')}
          aria-label={imageUrl ? 'Ganti foto menu' : 'Unggah foto menu'}
          disabled={busy}
          onChange={onPick}
          className="sr-only"
        />
        {imageUrl ? (
          <MenuPhoto item={{ name: item.name, imageUrl }} tone="none" width={448} className="absolute inset-0 h-full w-full" />
        ) : (
          <>
            <span className="text-primary">
              <UploadIcon />
            </span>
            <span className="text-sm font-extrabold text-primary">Unggah foto (pratinjau 4:3)</span>
            <span className="text-xs text-muted">JPG/PNG/WebP, maks. 2 MB</span>
          </>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm font-bold text-primary">
            {uploadImage.isPending ? 'Mengunggah…' : 'Menghapus…'}
          </span>
        )}
      </label>
      {imageUrl && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            Ganti foto
          </Button>
          <Button variant="danger-ghost" disabled={busy} onClick={remove}>
            Hapus foto
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
