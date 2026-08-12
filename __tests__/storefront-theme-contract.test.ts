import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const listPageFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listPageFiles(absolutePath);
    return entry.name === 'page.tsx' ? [absolutePath] : [];
  });

describe('storefront dark-mode wiring', () => {
  it('boots before paint and stays scoped away from admin', () => {
    const storefrontLayout = read('app/[locale]/layout.tsx');
    const adminLayout = read('app/admin/layout.tsx');
    const globalCss = read('app/globals.css');
    expect(storefrontLayout).toContain('STOREFRONT_THEME_BOOTSTRAP');
    expect(storefrontLayout).toContain('StorefrontThemeProvider');
    expect(storefrontLayout).toContain('storefront-theme');
    expect(adminLayout).not.toContain('StorefrontThemeProvider');
    expect(globalCss).toContain('body.storefront-theme');
  });

  it('keeps theme control and native Stripe appearance connected', () => {
    for (const header of ['components/Header.tsx', 'components/Header2.tsx', 'components/Headersearch.tsx']) {
      expect(read(header)).toContain('ThemeToggle');
      expect(read(header)).toContain('hidden md:inline-flex');
    }
    const stripeForm = read('components/StripePaymentForm.tsx');
    expect(stripeForm).toContain('useStorefrontTheme');
    expect(stripeForm).toContain("resolvedTheme === 'dark' ? 'night'");
  });

  it('keeps every public page inside the themed locale layout', () => {
    const localeRoot = path.join(process.cwd(), 'app/[locale]');
    const publicPages = listPageFiles(localeRoot);

    // Bump deliberately: every new public page must be reviewed for theme wiring.
    // 44 includes app/[locale]/offer/[token] (planner offer links), which renders
    // inside the themed locale layout and styles itself with the gray/white
    // utilities `body.storefront-theme` remaps for dark mode.
    expect(publicPages).toHaveLength(44);
    expect(read('app/[locale]/layout.tsx')).toContain('StorefrontThemeProvider');
    for (const page of publicPages) {
      const source = fs.readFileSync(page, 'utf8');
      expect(source).not.toMatch(/<html\b|<body\b/);
    }
  });
});
