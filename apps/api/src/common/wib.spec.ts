import { wibDate, wibDayRange } from './wib.js';

describe('tanggal WIB', () => {
  it('wibDate memakai UTC+7', () => {
    expect(wibDate(new Date('2026-11-05T16:59:59Z'))).toBe('2026-11-05');
    expect(wibDate(new Date('2026-11-05T17:00:00Z'))).toBe('2026-11-06');
  });

  it('wibDayRange mencakup hari WIB penuh, akhir inklusif', () => {
    expect(wibDayRange('2026-11-05', '2026-11-05')).toEqual({
      gte: new Date('2026-11-04T17:00:00Z'),
      lt: new Date('2026-11-05T17:00:00Z'),
    });
    expect(wibDayRange('2026-12-31', '2027-01-01')).toEqual({
      gte: new Date('2026-12-30T17:00:00Z'),
      lt: new Date('2027-01-01T17:00:00Z'),
    });
  });
});
