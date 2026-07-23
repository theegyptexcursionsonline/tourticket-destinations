import fs from 'node:fs';
import path from 'node:path';

describe('hero fallback assets', () => {
  it.each(['hero2.jpg', 'hero3.jpg'])('%s exists in public', (asset) => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', asset))).toBe(true);
  });

  it('does not reference the removed PNG fallbacks', () => {
    for (const relativePath of [
      'app/api/hero-settings/route.ts',
      'app/api/admin/hero-settings/route.ts',
      'app/[locale]/egypt/EgyptHeroClient.tsx',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      expect(source).not.toMatch(/\/hero[23]\.png/);
    }
  });
});
