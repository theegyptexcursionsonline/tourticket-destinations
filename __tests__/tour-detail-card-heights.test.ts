import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app/[locale]/[slug]/TourDetailClientPage.tsx'),
  'utf8',
);

// Client sheet row 47: a grid defaults to align-items: stretch, so a card
// with one line (e.g. "Not suitable for") was drawn at the full height of
// its long sibling ("Need to know") — hundreds of pixels of empty tint.
// Every paired-card grid in the detail sections must top-align so each
// card hugs its own content.
describe('tour detail paired-card grids size cards to their content', () => {
  it('every two-column card grid opts out of stretch alignment', () => {
    const grids = source.match(/className="grid grid-cols-1 md:grid-cols-2 gap-[68][^"]*"/g) ?? [];
    expect(grids.length).toBeGreaterThanOrEqual(5);
    for (const grid of grids) {
      expect(grid).toContain('items-start');
    }
  });
});
