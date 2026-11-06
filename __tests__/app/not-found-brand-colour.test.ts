/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import path from 'path';

// The Tailwind theme has no `primary` colour, so `bg-primary`, `text-primary`
// and `border-primary` compiled to nothing: the 404 page showed a white
// "Back to Homepage" label on a white button. The page must take the site's
// own brand colour from --primary-color instead.
const source = readFileSync(path.join(process.cwd(), 'app/[locale]/not-found.tsx'), 'utf8');
const config = readFileSync(path.join(process.cwd(), 'tailwind.config.ts'), 'utf8');

describe('404 page brand colour', () => {
  it('uses no primary utility the Tailwind theme does not define', () => {
    if (/\bprimary\s*:/.test(config)) return; // a defined theme colour would make them valid
    expect(source).not.toMatch(/\b(?:bg|text|border|ring)-primary\b/);
  });

  it('paints the main button with the site brand colour behind white text', () => {
    const button = source.match(/className="([^"]*text-white[^"]*)"/)?.[1] ?? '';
    expect(button).toContain('bg-[var(--primary-color,#dc2626)]');
  });

  it('outlines the secondary button in the brand colour', () => {
    expect(source).toContain('border-[var(--primary-color,#dc2626)]');
  });
});
