import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('hosted AI Search CSP', () => {
  it('permits the signed launcher script and hosted result frame', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    const searchOrigin = 'https://search.foxestechnology.com';
    const scriptPolicy = config.match(/"script-src[^\n]+"/)?.[0] || '';
    const framePolicy = config.match(/"frame-src[^\n]+"/)?.[0] || '';

    expect(scriptPolicy).toContain(searchOrigin);
    expect(framePolicy).toContain(searchOrigin);
  });
});
