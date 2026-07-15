import { toSafeCsvCell } from '@/lib/admin/csv';

describe('network admin CSV export', () => {
  it('quotes cells and neutralizes spreadsheet formulas', () => {
    expect(toSafeCsvCell('=HYPERLINK("https://example.test")')).toBe(
      '"\'=HYPERLINK(""https://example.test"")"'
    );
    expect(toSafeCsvCell('normal, value')).toBe('"normal, value"');
  });

  it('keeps each booking on one CSV row', () => {
    expect(toSafeCsvCell('first\nsecond')).toBe('"first second"');
  });
});
