import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

// Client request (MT sheet, 31 Aug): Manage Tours must match EEO — a
// "Last Modified" sort, and the destructive action reads "Move to Trash"
// with a "Trash" tab, while MT keeps its Empty trash and Duplicate controls.
describe('manage tours list parity with EEO', () => {
  const list = read('app/admin/tours/ToursListClient.tsx');
  const actions = read('app/admin/tours/TourActions.tsx');

  it('offers the Last Modified sort alongside newest and price', () => {
    expect(list).toContain("'newest' | 'updated' | 'price-asc' | 'price-desc'");
    expect(list).toContain('<option value="updated">🕒 Last Modified</option>');
    expect(list).toContain("if (sortBy === 'updated')");
    expect(list).toContain('updatedAt?: string;');
  });

  it('labels the destructive action Move to Trash and the tab Trash', () => {
    expect(actions).toContain('<span>Move to Trash</span>');
    expect(actions).toContain('Move tour to Trash');
    expect(actions).toContain('"Moving tour to Trash..."');
    expect(actions).not.toContain('<span>Archive</span>');
    expect(actions).not.toContain('Archive tour</h3>');
    expect(list).toContain("label: 'Trash', icon: Archive");
    expect(list).not.toContain("label: 'Archived'");
  });

  it('keeps the MT-only Empty trash and Duplicate controls', () => {
    expect(list).toContain('data-testid="empty-trash"');
    expect(list).toContain('Empty trash');
    expect(actions).toContain('Duplicate as Draft');
    expect(actions).toContain('Restore to Draft');
  });
});
