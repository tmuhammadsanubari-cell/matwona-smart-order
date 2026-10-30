import { createTablesSchema, ErrorCode, updateTableSchema } from 'shared';
import { AppException } from '../../common/app.exception.js';
import type { DiningTable } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { generateTableToken, TABLE_TOKEN_PATTERN } from './table-token.js';
import { TablesService } from './tables.service.js';

const OUTLET = 'outlet-1';
const outlet = { id: OUTLET, slug: 'matwona', name: 'Matwona' };

function makeTable(overrides: Partial<DiningTable> = {}): DiningTable {
  return {
    id: 'table-1',
    outletId: OUTLET,
    label: '1',
    capacity: 4,
    qrToken: generateTableToken(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup() {
  const diningTable = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    createManyAndReturn: vi.fn(),
    update: vi.fn(),
  };
  const service = new TablesService({ diningTable } as unknown as PrismaService);
  return { service, diningTable };
}

async function expectAppError(promise: Promise<unknown>, code: ErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  return error as AppException;
}

describe('generateTableToken (NFR-010)', () => {
  it('menghasilkan token base62 22 karakter yang unik', () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateTableToken));
    expect(tokens.size).toBe(1000);
    for (const t of tokens) expect(t).toMatch(TABLE_TOKEN_PATTERN);
  });
});

describe('TablesService.resolveToken (FR-001)', () => {
  it('token valid mengembalikan label meja dan outlet', async () => {
    const { service, diningTable } = setup();
    const table = makeTable({ label: 'A3' });
    diningTable.findUnique.mockResolvedValue({ ...table, outlet });

    await expect(service.resolveToken(table.qrToken)).resolves.toEqual({
      table: { id: table.id, label: 'A3' },
      outlet,
    });
    expect(diningTable.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { qrToken: table.qrToken } }),
    );
  });

  it('token tidak dikenal → INVALID_TABLE_TOKEN', async () => {
    const { service, diningTable } = setup();
    diningTable.findUnique.mockResolvedValue(null);
    const error = await expectAppError(
      service.resolveToken(generateTableToken()),
      ErrorCode.INVALID_TABLE_TOKEN,
    );
    expect(error.message).toBe('QR tidak dikenali, silakan hubungi kasir.');
  });

  it('meja nonaktif tidak bisa dipakai memesan (FR-011)', async () => {
    const { service, diningTable } = setup();
    const table = makeTable({ isActive: false });
    diningTable.findUnique.mockResolvedValue({ ...table, outlet });
    await expectAppError(service.resolveToken(table.qrToken), ErrorCode.INVALID_TABLE_TOKEN);
  });

  it('format token salah ditolak tanpa query ke DB', async () => {
    const { service, diningTable } = setup();
    await expectAppError(service.resolveToken("abc'; DROP TABLE"), ErrorCode.INVALID_TABLE_TOKEN);
    expect(diningTable.findUnique).not.toHaveBeenCalled();
  });
});

describe('TablesService.list', () => {
  it('hanya meja outlet staf, diurutkan natural (2 sebelum 10)', async () => {
    const { service, diningTable } = setup();
    diningTable.findMany.mockResolvedValue([
      makeTable({ id: 'a', label: '10' }),
      makeTable({ id: 'b', label: '2' }),
      makeTable({ id: 'c', label: 'A1' }),
    ]);
    const result = await service.list(OUTLET);
    expect(diningTable.findMany).toHaveBeenCalledWith({ where: { outletId: OUTLET } });
    expect(result.map((t) => t.label)).toEqual(['2', '10', 'A1']);
  });
});

describe('TablesService.create (FR-011)', () => {
  it('membuat satu meja dengan token QR baru', async () => {
    const { service, diningTable } = setup();
    diningTable.findMany.mockResolvedValue([]);
    diningTable.createManyAndReturn.mockImplementation(async ({ data }) =>
      data.map((d: Partial<DiningTable>, i: number) => makeTable({ ...d, id: `t${i}` })),
    );

    const [table] = await service.create(OUTLET, { label: 'A1', capacity: 2 });
    expect(table).toMatchObject({ label: 'A1', capacity: 2, isActive: true });
    expect(table!.qrToken).toMatch(TABLE_TOKEN_PATTERN);
    const { data } = diningTable.createManyAndReturn.mock.calls[0]![0];
    expect(data[0]).toMatchObject({ outletId: OUTLET, label: 'A1', capacity: 2 });
  });

  it('bulk membuat banyak meja dengan token berbeda', async () => {
    const { service, diningTable } = setup();
    diningTable.findMany.mockResolvedValue([]);
    diningTable.createManyAndReturn.mockImplementation(async ({ data }) =>
      data.map((d: Partial<DiningTable>, i: number) => makeTable({ ...d, id: `t${i}` })),
    );

    const result = await service.create(OUTLET, { labels: ['A2', 'A1', 'A10'] });
    expect(result.map((t) => t.label)).toEqual(['A1', 'A2', 'A10']);
    expect(new Set(result.map((t) => t.qrToken)).size).toBe(3);
  });

  it('label yang sudah dipakai di outlet → TABLE_LABEL_TAKEN', async () => {
    const { service, diningTable } = setup();
    diningTable.findMany.mockResolvedValue([{ label: 'A1' }]);
    const error = await expectAppError(
      service.create(OUTLET, { labels: ['A1', 'A2'] }),
      ErrorCode.TABLE_LABEL_TAKEN,
    );
    expect(error.details).toEqual({ labels: ['A1'] });
    expect(diningTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { outletId: OUTLET, label: { in: ['A1', 'A2'] } } }),
    );
    expect(diningTable.createManyAndReturn).not.toHaveBeenCalled();
  });

  it('label ganda dalam satu request bulk → TABLE_LABEL_TAKEN', async () => {
    const { service } = setup();
    await expectAppError(service.create(OUTLET, { labels: ['A1', 'A1'] }), ErrorCode.TABLE_LABEL_TAKEN);
  });

  it('pelanggaran unique dari DB (request paralel) → TABLE_LABEL_TAKEN', async () => {
    const { service, diningTable } = setup();
    diningTable.findMany.mockResolvedValue([]);
    diningTable.createManyAndReturn.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expectAppError(service.create(OUTLET, { label: 'A1' }), ErrorCode.TABLE_LABEL_TAKEN);
  });
});

describe('TablesService.update', () => {
  it('meja outlet lain dianggap tidak ada (NFR-016)', async () => {
    const { service, diningTable } = setup();
    diningTable.findFirst.mockResolvedValue(null);
    await expectAppError(service.update(OUTLET, 'table-x', { isActive: false }), ErrorCode.NOT_FOUND);
    expect(diningTable.findFirst).toHaveBeenCalledWith({ where: { id: 'table-x', outletId: OUTLET } });
  });

  it('menonaktifkan meja', async () => {
    const { service, diningTable } = setup();
    const table = makeTable();
    diningTable.findFirst.mockResolvedValue(table);
    diningTable.update.mockResolvedValue({ ...table, isActive: false });
    await expect(service.update(OUTLET, table.id, { isActive: false })).resolves.toMatchObject({
      isActive: false,
    });
  });

  it('ganti label ke label meja lain → TABLE_LABEL_TAKEN', async () => {
    const { service, diningTable } = setup();
    diningTable.findFirst.mockResolvedValueOnce(makeTable()).mockResolvedValueOnce({ id: 'other' });
    await expectAppError(service.update(OUTLET, 'table-1', { label: '2' }), ErrorCode.TABLE_LABEL_TAKEN);
    expect(diningTable.update).not.toHaveBeenCalled();
  });
});

describe('skema meja (shared)', () => {
  it('merapikan spasi label dan menolak label kosong / > 20 karakter', () => {
    expect(createTablesSchema.parse({ label: '  Teras   1 ' })).toEqual({ label: 'Teras 1' });
    expect(createTablesSchema.safeParse({ label: '   ' }).success).toBe(false);
    expect(createTablesSchema.safeParse({ label: 'x'.repeat(21) }).success).toBe(false);
    expect(createTablesSchema.safeParse({ labels: [] }).success).toBe(false);
  });

  it('update wajib berisi minimal satu field', () => {
    expect(updateTableSchema.safeParse({}).success).toBe(false);
    expect(updateTableSchema.safeParse({ capacity: null }).success).toBe(true);
  });
});
