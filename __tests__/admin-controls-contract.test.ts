import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('English network admin control contracts', () => {
  it('wires the booking-detail Export button to the safe CSV handler', () => {
    const source = read('app/admin/bookings/[id]/page.tsx');
    expect(source).toContain('const handleExport = () =>');
    expect(source).toContain('onClick={handleExport}');
    expect(source).toContain('toSafeCsvCell');
  });

  it('uses the complete lightweight catalogue for Manifest and booking filters', () => {
    const manifest = read('app/admin/manifests/page.tsx');
    const bookings = read('app/admin/bookings/BookingsPageClient.tsx');
    expect(manifest).toContain('/api/admin/tours/options?');
    expect(manifest).toContain("limit: '1000'");
    expect(bookings).toContain("params.set('limit', '1000')");
    expect(manifest).not.toContain("fetch('/api/admin/tours')");
  });
});
