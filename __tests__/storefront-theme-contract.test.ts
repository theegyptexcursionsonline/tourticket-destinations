import fs from 'node:fs';
import path from 'node:path';
import {
  buildDarkThemeCss,
  extractGeneratedBlock,
} from '../scripts/theme/buildDarkThemeCss';
import { chroma, classifyUtility, splitVariants, tailwindColorOf } from '../scripts/theme/darkSurfaceMap';
import { collectClassLists, collectStorefrontTokens } from '../scripts/theme/scanStorefront';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

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
    expect(globalCss).toContain('.es-review-background-container');
    expect(globalCss).not.toMatch(/html\[data-storefront-theme="dark"\]\s+body\s*\{/);
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
    const localeRoot = path.join(root, 'app/[locale]');
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

describe('storefront dark-mode surface coverage', () => {
  const built = buildDarkThemeCss(root);
  const committed = extractGeneratedBlock(read('app/globals.css'));

  it('has the generated override block committed and up to date', () => {
    // Guards the whole approach: adding a light Tailwind utility to any
    // storefront component fails here until `pnpm theme:generate` is re-run,
    // instead of silently shipping a white patch in dark mode.
    expect(committed).not.toBeNull();
    expect(committed).toBe(built.css);
  });

  it('covers every light surface utility used in storefront source', () => {
    const uncovered = built.darkened.filter(
      (token) => !built.css.includes(`[class~="${token}"]`),
    );
    expect(uncovered).toEqual([]);
    // The storefront genuinely uses a large light palette; if this collapses
    // toward zero the scanner has silently stopped finding files.
    expect(built.darkened.length).toBeGreaterThan(200);
  });

  it('recolors the gradients that regressed on featured tours and interest grid', () => {
    // Both shipped white in dark mode because only background-color was mapped
    // while the Tailwind gradient background-image kept its light stops.
    for (const token of ['from-white', 'to-gray-50', 'via-slate-50']) {
      expect(built.css).toContain(`[class~="${token}"]`);
    }
    expect(built.css).toContain('--tw-gradient-from:');
    expect(built.css).toContain('--tw-gradient-stops:');
    expect(read('components/FeaturedTours.tsx')).toContain('bg-gradient-to-b from-white to-gray-50');
    expect(read('components/InterestGrid.tsx')).toContain('from-white via-slate-50 to-white');
  });

  it('preserves image overlays, glass and brand accents', () => {
    const preservedTokens = built.preserved.map((entry) => entry.token);
    // Shine sweeps and glass chips over hero photography.
    expect(preservedTokens).toEqual(expect.arrayContaining(['bg-white/10', 'via-white/20']));
    // Outline CTAs over hero images (`border-2 border-white text-white`).
    expect(preservedTokens).toContain('border-white');
    // Saturated brand gradients stay untouched when this storefront uses them.
    if (collectStorefrontTokens(root).has('from-[#4385F6]')) {
      expect(preservedTokens).toContain('from-[#4385F6]');
    }

    // A preserved token may still appear inside a `:not(...)` exclusion — that
    // is the mechanism that protects it. What must never happen is it appearing
    // in a `:where(...)` target list, which would repaint it.
    for (const token of preservedTokens) {
      const attribute = `[class~="${token}"]`;
      const total = built.css.split(attribute).length - 1;
      const excluded = built.css.split(`:not(${attribute})`).length - 1;
      expect({ token, targeted: total - excluded }).toEqual({ token, targeted: 0 });
    }
  });

  it('never darkens gradient text headlines', () => {
    // `from-white via-slate-100 to-slate-300 bg-clip-text` paints the headline
    // itself on top of a photo — darkening the stops erases the text.
    expect(built.css).toContain(':not([class~="bg-clip-text"])');
    const clipTextGradients = collectClassLists(root).filter(
      ({ classList }) => classList.includes('bg-clip-text') && /\b(?:from|via|to)-white\b/.test(classList),
    );
    expect(clipTextGradients.length).toBeGreaterThan(0);
  });

  it('holds the invariant that no gradient mixes a light stop with a brand stop', () => {
    // Stop colours are rewritten independently, so a gradient running from a
    // pale stop into a saturated brand stop (`from-blue-50 to-blue-600`) would
    // half-darken and look broken. None exist today; this fails if one lands.
    // Mid neutrals (`to-slate-400`) are fine — the result stays a grey ramp.
    const SATURATED_CHROMA = 0.35;
    const offenders: string[] = [];

    for (const { file, classList } of collectClassLists(root)) {
      const stops = classList
        .split(/\s+/)
        .map((raw) => splitVariants(raw.replace(/^!/, '')).base)
        .filter((base) => /^(?:from|via|to)-/.test(base));
      if (stops.length < 2) continue;

      const darkened = stops.some((base) => classifyUtility(base)?.action === 'darken');
      const brand = stops.filter((base) => {
        if (classifyUtility(base)) return false;
        const hex = tailwindColorOf(base);
        return hex !== null && chroma(hex) > SATURATED_CHROMA;
      });
      if (darkened && brand.length) offenders.push(`${file}: [${brand.join(', ')}] in "${classList.slice(0, 100)}"`);
    }

    expect(offenders).toEqual([]);
  });

  it('leaves explicit border colours alone when repainting default borders', () => {
    // `border-b border-red-500` must keep its red; only Tailwind's light
    // default border colour is repainted.
    expect(built.css).toContain(':not([class~="border-red-500"])');
    expect(built.css).toContain(':not([class~="border-white"])');
  });

  it('scopes every generated rule to the storefront body', () => {
    const ruleLines = built.css
      .split('\n')
      .filter((line) => line.includes('html[data-storefront-theme'));
    expect(ruleLines.length).toBeGreaterThan(0);
    for (const line of ruleLines) {
      expect(line).toContain('body.storefront-theme');
    }
  });

  it('ignores admin surfaces entirely', () => {
    const tokens = collectStorefrontTokens(root);
    const files = new Set([...tokens.values()].flatMap((usage) => [...usage.files]));
    expect([...files].filter((file) => file.includes('admin'))).toEqual([]);
  });
});
