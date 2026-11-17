/**
 * Destination and category pages carry their own interface label tables.
 * Every language the site offers must have its own table, and the page must
 * pick the visitor language (German, French, Spanish and Russian visitors
 * used to get the English labels).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '@/i18n/config';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const pages = {
  destination: { source: read('app/[locale]/destinations/[slug]/DestinationPageClient.tsx'), table: 'destinationPageCopy', type: 'DestinationPageCopy' },
  category: { source: read('app/[locale]/categories/[slug]/CategoryPageClient.tsx'), table: 'CATEGORY_PAGE_COPY', type: 'CategoryPageCopy' },
};

// The keys of a table entry: lines indented four spaces inside "  xx: {".
function entryKeys(source: string, table: string, language: string): string[] {
  const start = source.indexOf(`const ${table}`);
  const body = source.slice(start);
  const open = body.indexOf(`\n  ${language}: {`);
  if (open < 0) return [];
  const close = body.indexOf('\n  },', open);
  return body.slice(open, close).split('\n').map((row) => row.match(/^ {4}(\w+):/)?.[1]).filter((k): k is string => Boolean(k));
}

function typeKeys(source: string, type: string): string[] {
  const start = source.indexOf(`type ${type} = {`);
  const end = source.indexOf('\n};', start);
  return source.slice(start, end).split('\n').map((row) => row.match(/^ {2}(\w+):/)?.[1]).filter((k): k is string => Boolean(k));
}

describe.each(Object.entries(pages))('%s page labels', (_name, page) => {
  const keys = typeKeys(page.source, page.type);

  it.each([...locales])('has a complete %s table', (language) => {
    expect(keys.length).toBeGreaterThan(30);
    expect(entryKeys(page.source, page.table, language).sort()).toEqual([...keys].sort());
  });

  it('picks the table by the visitor language, not Arabic-or-English', () => {
    expect(page.source).not.toMatch(/\? (destinationPageCopy|CATEGORY_PAGE_COPY)\.ar : (destinationPageCopy|CATEGORY_PAGE_COPY)\.en/);
    expect(page.source).toMatch(/slice\(0, 2\)\.toLowerCase\(\)/);
  });

  it('German, French, Spanish and Russian tables are translated, not English copies', () => {
    const english = page.source.slice(page.source.indexOf(`const ${page.table}`));
    for (const language of ['de', 'fr', 'es', 'ru']) {
      const pick = (lang: string, key: string) => english.match(new RegExp(`\\n  ${lang}: \\{[\\s\\S]*?\\n    ${key}: ([^\\n]+)`))?.[1];
      const same = ['home', 'clearAllFilters', 'noToursFound', 'searchToursPlaceholder', 'popularSearches', 'learnMoreAboutUs']
        .filter((key) => pick('en', key) !== undefined)
        .filter((key) => pick(language, key) === pick('en', key));
      expect({ language, same }).toEqual({ language, same: [] });
    }
  });
});

describe('category duration summary', () => {
  it('has no English-only fallback sentence', () => {
    expect(pages.category.source).not.toContain(": 'Varied trip lengths from short outings to full-day tours';");
    expect(pages.category.source).toContain('categoryPageCopyFor(locale).variedTripLengths');
  });
});
