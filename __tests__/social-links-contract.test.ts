import fs from 'node:fs';
import path from 'node:path';
import {OFFICIAL_SOCIAL_LINKS} from '@/lib/config/socialLinks';

describe('official social-link contract', () => {
  it('uses the published EEO YouTube channel without a numeric fallback handle', () => {
    expect(OFFICIAL_SOCIAL_LINKS.youtube).toBe(
      'https://www.youtube.com/@egyptexcursionsonline',
    );
    expect(OFFICIAL_SOCIAL_LINKS.youtube).not.toMatch(/@[a-z]+\d+\/?$/i);
  });

  it.each([
    'components/Footer.tsx',
    'app/[locale]/contact/ContactClientPage.tsx',
  ])('keeps %s on the shared official-link source', file => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(source).toContain('OFFICIAL_SOCIAL_LINKS');
    expect(source).not.toContain('@egyptexcursionsonline6859');
  });
});
