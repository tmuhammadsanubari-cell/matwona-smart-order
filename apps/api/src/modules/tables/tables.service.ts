import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { CreateTablesInput, DiningTableDto, PublicTableInfo, TablesQrQuery, UpdateTableInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { DiningTable } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { renderTablesQrPdf } from './qr-pdf.js';
import { generateTableToken, TABLE_TOKEN_PATTERN } from './table-token.js';

const labelCollator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

const toDto = (t: DiningTable): DiningTableDto => ({
  id: t.id,
  label: t.label,
  capacity: t.capacity,
  qrToken: t.qrToken,
  isActive: t.isActive,
});

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

const labelTaken = (labels: string[]) =>
  new AppException(
    ErrorCode.TABLE_LABEL_TAKEN,
    `Label meja sudah dipakai: ${labels.join(', ')}.`,
    { labels },
  );

/** Meja & token QR (FR-001, FR-011). Semua query admin difilter outletId (NFR-016). */
@Injectable()
export class TablesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Validasi token QR dari pelanggan. Dipakai GET /public/tables/:token dan
   * nantinya header X-Table-Token saat membuat pesanan (S1-06).
   */
  async resolveToken(token: string): Promise<PublicTableInfo> {
    const table = TABLE_TOKEN_PATTERN.test(token)
      ? await this.prisma.diningTable.findUnique({
          where: { qrToken: token },
          include: { outlet: { select: { id: true, slug: true, name: true } } },
        })
      : null;
    if (!table || !table.isActive) {
      throw new AppException(
        ErrorCode.INVALID_TABLE_TOKEN,
        'QR tidak dikenali, silakan hubungi kasir.',
      );
    }
    return { table: { id: table.id, label: table.label }, outlet: table.outlet };
  }

  async list(outletId: string): Promise<DiningTableDto[]> {
    const tables = await this.prisma.diningTable.findMany({ where: { outletId } });
    return tables.sort((a, b) => labelCollator.compare(a.label, b.label)).map(toDto);
  }

  async create(outletId: string, input: CreateTablesInput): Promise<DiningTableDto[]> {
    const labels = 'labels' in input ? input.labels : [input.label];
    const capacity = 'label' in input ? (input.capacity ?? null) : null;

    const duplicatesInInput = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (duplicatesInInput.length) throw labelTaken([...new Set(duplicatesInInput)]);

    const existing = await this.prisma.diningTable.findMany({
      where: { outletId, label: { in: labels } },
      select: { label: true },
    });
    if (existing.length) throw labelTaken(existing.map((t) => t.label));

    try {
      const created = await this.prisma.diningTable.createManyAndReturn({
        data: labels.map((label) => ({ outletId, label, capacity, qrToken: generateTableToken() })),
      });
      return created.sort((a, b) => labelCollator.compare(a.label, b.label)).map(toDto);
    } catch (e) {
      // Request paralel dengan label yang sama lolos cek di atas; constraint DB yang menolak.
      if (isUniqueViolation(e)) throw labelTaken(labels);
      throw e;
    }
  }

  async update(outletId: string, id: string, input: UpdateTableInput): Promise<DiningTableDto> {
    const table = await this.prisma.diningTable.findFirst({ where: { id, outletId } });
    if (!table) throw new AppException(ErrorCode.NOT_FOUND, 'Meja tidak ditemukan.');

    if (input.label !== undefined && input.label !== table.label) {
      const clash = await this.prisma.diningTable.findFirst({
        where: { outletId, label: input.label, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw labelTaken([input.label]);
    }

    try {
      return toDto(await this.prisma.diningTable.update({ where: { id }, data: input }));
    } catch (e) {
      if (isUniqueViolation(e) && input.label) throw labelTaken([input.label]);
      throw e;
    }
  }

  /**
   * Ganti token QR meja (FR-011, NFR-010): URL QR lama langsung ditolak `resolveToken`.
   * Pesanan yang sudah ada tidak terpengaruh (terikat ke tableId, bukan token).
   */
  async regenerateToken(outletId: string, id: string): Promise<DiningTableDto> {
    const table = await this.prisma.diningTable.findFirst({ where: { id, outletId }, select: { id: true } });
    if (!table) throw new AppException(ErrorCode.NOT_FOUND, 'Meja tidak ditemukan.');
    return toDto(await this.prisma.diningTable.update({ where: { id }, data: { qrToken: generateTableToken() } }));
  }

  /** PDF QR siap cetak untuk meja aktif outlet ini (semua, atau `ids` terpilih). */
  async qrPdf(outletId: string, query: TablesQrQuery): Promise<Buffer> {
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId }, select: { name: true, slug: true } });
    const tables = await this.prisma.diningTable.findMany({
      where: { outletId, isActive: true, ...(query.ids && { id: { in: query.ids } }) },
      select: { label: true, qrToken: true },
    });
    if (tables.length === 0) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Tidak ada meja aktif untuk dicetak.');
    }
    return renderTablesQrPdf({
      outletName: outlet.name,
      outletSlug: outlet.slug,
      webBaseUrl: publicWebUrl(),
      layout: query.layout,
      tables: tables.sort((a, b) => labelCollator.compare(a.label, b.label)),
    });
  }
}

/**
 * Alamat web yang dicetak di QR. `PUBLIC_WEB_URL` (mis. https://matwona.id); bila kosong memakai origin
 * pertama `WEB_ORIGIN`. Untuk uji di HP lewat hotspot laptop: http://192.168.137.1:3000.
 */
export function publicWebUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.PUBLIC_WEB_URL?.trim() || env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
}
