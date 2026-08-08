import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('admin duplicate actions', () => {
  it('offers Tour, Destination and Page duplication as draft actions', () => {
    expect(read('app/admin/tours/TourActions.tsx')).toContain('Duplicate as Draft');
    expect(read('app/admin/destinations/DestinationManager.tsx')).toContain('Duplicate destination as draft');
    expect(read('app/admin/pages/page.tsx')).toContain('Duplicate as unpublished draft');
  });

  it('routes every action to a protected duplicate endpoint', () => {
    expect(read('app/admin/tours/TourActions.tsx')).toContain('/duplicate`');
    expect(read('app/admin/destinations/DestinationManager.tsx')).toContain('/duplicate`');
    expect(read('app/admin/pages/page.tsx')).toContain("fetch('/api/admin/pages/duplicate'");
  });
});
