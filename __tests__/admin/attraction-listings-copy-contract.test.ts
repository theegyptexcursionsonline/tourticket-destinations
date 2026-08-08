import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('attraction and Category 2 listing copy', () => {
  it('persists editable title and subtitle fields', () => {
    const model = read('lib/models/AttractionPage.ts');
    const form = read('components/admin/AttractionPageForm.tsx');
    expect(model).toContain('linkedPagesTitle:');
    expect(model).toContain('linkedPagesSubtitle:');
    expect(form).toContain('name="linkedPagesTitle"');
    expect(form).toContain('name="linkedPagesSubtitle"');
  });

  it('uses the shared no-fallback renderer on both public attraction templates', () => {
    for (const path of ['components/AttractionLandingPage.tsx', 'components/AttractionPageTemplate.tsx']) {
      const source = read(path);
      expect(source).toContain('<LinkedPageCardsSection');
      expect(source).toContain('linkedPagesSubtitle');
    }
  });
});
