import { z } from 'zod';

// Sumber: PRD 2.2.1, 2.2.8 & tabel dining_tables (4.2)

const tableLabel = z
  .string()
  .trim()
  .min(1, 'Label meja wajib diisi')
  .max(20, 'Label meja maksimal 20 karakter')
  .transform((label) => label.replace(/\s+/g, ' '));

const tableCapacity = z.number().int().min(1, 'Kapasitas minimal 1').max(50).nullable();

/** POST /tables: satu meja `{ label, capacity? }` atau bulk `{ labels: ["A1","A2"] }`. */
export const createTablesSchema = z.union([
  z.object({ label: tableLabel, capacity: tableCapacity.optional() }),
  z.object({ labels: z.array(tableLabel).min(1, 'Minimal satu meja').max(100) }),
]);
export type CreateTablesInput = z.infer<typeof createTablesSchema>;

export const updateTableSchema = z
  .object({
    label: tableLabel.optional(),
    capacity: tableCapacity.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'Tidak ada data yang diubah');
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

/** Data meja untuk admin. */
export interface DiningTableDto {
  id: string;
  label: string;
  capacity: number | null;
  qrToken: string;
  isActive: boolean;
}

/** Response GET /public/tables/:token — konteks meja untuk halaman menu pelanggan. */
export interface PublicTableInfo {
  table: { id: string; label: string };
  outlet: { id: string; slug: string; name: string };
}
