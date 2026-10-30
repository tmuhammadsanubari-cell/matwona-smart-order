import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from 'shared';
import type { CreateTablesInput, DiningTableDto, PublicTableInfo, UpdateTableInput } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { DiningTable } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
}
