/**
 * Scans public storefront source for the Tailwind class tokens the dark-theme
 * override layer has to account for.
 *
 * Both the generator (scripts/generate-dark-theme-css.ts) and the contract test
 * (__tests__/storefront-theme-contract.test.ts) call this, so the CSS that gets
 * written and the CSS the test demands can never drift apart.
 *
 * Admin and provider dashboards are excluded on purpose: they never receive the
 * `.storefront-theme` body class and are out of scope for storefront dark mode.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Directories/files that make up the public storefront. */
export const STOREFRONT_ROOTS = [
  'app/[locale]',
  'app/global-error.tsx',
  'components',
  'contexts',
];

/** Never scanned: admin surfaces, tests, build output. */
// The offer route pins its own art-directed palette (app/[locale]/offer/layout.tsx)
// and never receives the dark remap, so its utilities stay out of the map.
const EXCLUDED = /(^|\/)(admin|offer|__tests__|__mocks__|node_modules|\.next|e2e)(\/|$)/;

export interface TokenUsage {
  /** Full token as written, e.g. `md:hover:bg-white`. */
  token: string;
  count: number;
  files: Set<string>;
}

function walk(root: string, target: string, out: string[]): void {
  const rel = path.relative(root, target);
  if (rel && EXCLUDED.test(rel)) return;
  let stat: fs.Stats;
  try {
    stat = fs.statSync(target);
  } catch {
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) walk(root, path.join(target, entry), out);
  } else if (/\.(tsx|jsx|ts|js)$/.test(target)) {
    out.push(target);
  }
}

export function listStorefrontFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of STOREFRONT_ROOTS) walk(root, path.join(root, entry), files);
  return files.sort();
}

/**
 * Extracts candidate class tokens from every quoted/backticked string in the
 * storefront tree. Deliberately over-collects — `classifyUtility` decides what
 * actually matters, so a stray non-class string is harmless.
 */
export interface ClassListUsage {
  file: string;
  classList: string;
}

/**
 * Returns every string literal that looks like a Tailwind class list, keeping
 * tokens grouped per element. Needed for checks that depend on which utilities
 * co-occur (e.g. a gradient mixing a light stop with a saturated brand stop).
 */
export function collectClassLists(root: string): ClassListUsage[] {
  const out: ClassListUsage[] = [];
  for (const file of listStorefrontFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const literal of source.match(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g) ?? []) {
      // A multi-line template literal is usually prose or code that merely
      // contains a class list, so score each line independently.
      for (const classList of literal.slice(1, -1).split('\n')) {
        if (!/\b(?:bg|text|border|from|via|to|ring|divide)-/.test(classList)) continue;
        out.push({ file: path.relative(root, file), classList: classList.trim() });
      }
    }
  }
  return out;
}

export function collectStorefrontTokens(root: string): Map<string, TokenUsage> {
  const usages = new Map<string, TokenUsage>();

  for (const file of listStorefrontFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const strings = source.match(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g) ?? [];
    for (const literal of strings) {
      // Split on whitespace and template-literal punctuation so
      // `${cond ? 'bg-white' : ''}` still yields clean tokens. `:` and `?` are
      // NOT separators — `hover:bg-white` is one token and must survive.
      // Commas and parentheses are valid inside arbitrary values such as
      // `bg-[linear-gradient(180deg,#fff_0%,#fff_100%)]`; keep them intact.
      for (const raw of literal.slice(1, -1).split(/[\s${};'"`]+/)) {
        const token = raw.replace(/^!/, '').trim();
        // Arbitrary-value utilities can be long (for example a full linear
        // gradient), but class tokens still never contain path or JS syntax.
        if (!token || token.length > 240 || /[/\\.]{2}|=|<|>/.test(token)) continue;
        let usage = usages.get(token);
        if (!usage) {
          usage = { token, count: 0, files: new Set() };
          usages.set(token, usage);
        }
        usage.count++;
        usage.files.add(path.relative(root, file));
      }
    }
  }

  return usages;
}
