import type { TableQrLayout } from 'shared';
import { downloadStaffFile } from './staff-download';

/** Unduh PDF QR meja (GET /tables/qr.pdf, FR-011). */
export async function downloadTablesQr(options: { ids?: string[]; layout: TableQrLayout }): Promise<void> {
  const query = new URLSearchParams({ layout: options.layout, ...(options.ids?.length ? { ids: options.ids.join(',') } : {}) }).toString();
  await downloadStaffFile(`/tables/qr.pdf?${query}`, {
    // Sama dengan nama dari server; dipakai bila header Content-Disposition tidak terbaca (CORS).
    fallbackName: `qr-meja-${options.layout}.pdf`,
    errorMessage: 'Gagal mengunduh PDF QR. Coba lagi.',
  });
}
