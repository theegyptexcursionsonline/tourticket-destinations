/**
 * Builds the generated half of the storefront dark-theme layer in
 * app/globals.css from the light Tailwind utilities the storefront actually
 * uses. See scripts/theme/darkSurfaceMap.ts for why this is generated.
 */
import {
  BREAKPOINTS,
  bucketColor,
  bucketSpec,
  classifyUtility,
  gradientStopDeclarations,
  isBorderColorUtility,
  splitVariants,
  type Classification,
} from './darkSurfaceMap';
import { collectStorefrontTokens } from './scanStorefront';

export const GENERATED_START =
  '/* dark-theme:generated:start — built by `pnpm theme:generate`; do not hand-edit */';
export const GENERATED_END = '/* dark-theme:generated:end */';

const SCOPE = 'html[data-storefront-theme="dark"] body.storefront-theme';

/**
 * Gradient stops are skipped on `bg-clip-text`: the hero headlines paint a
 * light gradient *through the text* while sitting on photography
 * (`from-white via-slate-100 to-slate-300 bg-clip-text text-transparent`).
 * Darkening those stops makes the headline unreadable.
 */
const GRADIENT_EXCLUSIONS = ['bg-clip-text'];

const STOP_ORDER = ['from', 'via', 'to'] as const;
type StopPosition = (typeof STOP_ORDER)[number];

interface VariantSelector {
  /** Ancestor/sibling prefix, e.g. `.group:hover `. */
  prefix: string;
  /** Pseudo-class/element appended to the element, e.g. `:hover`. */
  pseudo: string;
  /** Media query condition, if the chain has a responsive variant. */
  media: string | null;
}

export class UnsupportedVariantError extends Error {}

/** Translates a Tailwind variant chain into selector pieces. */
export function resolveVariants(variants: string[]): VariantSelector {
  let prefix = '';
  let pseudo = '';
  let media: string | null = null;

  for (const variant of variants) {
    if (BREAKPOINTS[variant]) {
      media = `(min-width: ${BREAKPOINTS[variant]})`;
      continue;
    }
    switch (variant) {
      case 'hover': pseudo += ':hover'; break;
      case 'focus': pseudo += ':focus'; break;
      case 'focus-visible': pseudo += ':focus-visible'; break;
      case 'focus-within': pseudo += ':focus-within'; break;
      case 'active': pseudo += ':active'; break;
      case 'disabled': pseudo += ':disabled'; break;
      case 'first': pseudo += ':first-child'; break;
      case 'last': pseudo += ':last-child'; break;
      case 'odd': pseudo += ':nth-child(odd)'; break;
      case 'even': pseudo += ':nth-child(even)'; break;
      case 'placeholder': pseudo += '::placeholder'; break;
      case 'group-hover': prefix = '.group:hover ' + prefix; break;
      case 'group-focus': prefix = '.group:focus ' + prefix; break;
      case 'peer-focus': prefix = '.peer:focus ~ ' + prefix; break;
      default:
        throw new UnsupportedVariantError(
          `Unsupported Tailwind variant "${variant}" on a light storefront utility. ` +
          `Add it to resolveVariants() in scripts/theme/buildDarkThemeCss.ts so dark mode covers it.`,
        );
    }
  }
  return { prefix, pseudo, media };
}

interface Group {
  tokens: string[];
  variants: string[];
  bucket: string;
  kind: Classification['kind'];
}

const tokenSelector = (tokens: string[]) =>
  `:where(${tokens.map((t) => `[class~="${cssEscape(t)}"]`).join(', ')})`;

/** Escapes `/`, `[`, `]`, `#`, `.` so `bg-white/70` is a valid attribute value. */
function cssEscape(token: string): string {
  return token.replace(/"/g, '\\"');
}

function rule(selector: string, declarations: string[], indent = ''): string {
  const body = declarations.map((d) => `${indent}  ${d} !important;`).join('\n');
  return `${indent}${selector} {\n${body}\n${indent}}`;
}

export interface BuildResult {
  css: string;
  darkened: string[];
  preserved: Classification[];
}

export function buildDarkThemeCss(root: string): BuildResult {
  const usages = collectStorefrontTokens(root);

  const groups = new Map<string, Group>();
  /** `${position}|${bucket}|${variantKey}` -> stop tokens sharing one rule. */
  const gradientGroups = new Map<string, { tokens: string[]; position: StopPosition; bucket: string; variants: string[] }>();
  const borderColorTokens = new Set<string>();
  const darkened: string[] = [];
  const preserved: Classification[] = [];

  for (const token of [...usages.keys()].sort()) {
    const { variants, base } = splitVariants(token);
    const classification = classifyUtility(base);
    if (!classification) {
      // Track every border-colour utility, light or not, so the bare
      // border-width rule can exclude the ones it must not repaint.
      if (isBorderColorUtility(base)) borderColorTokens.add(token);
      continue;
    }
    if (classification.action === 'preserve') {
      preserved.push(classification);
      if (classification.kind === 'border-color') borderColorTokens.add(token);
      continue;
    }
    darkened.push(token);

    const variantKey = variants.join(':');
    if (classification.kind === 'gradient-stop') {
      const position = base.split('-')[0] as StopPosition;
      const key = `${position}|${classification.bucket}|${variantKey}`;
      let group = gradientGroups.get(key);
      if (!group) {
        group = { tokens: [], position, bucket: classification.bucket!, variants };
        gradientGroups.set(key, group);
      }
      group.tokens.push(token);
      continue;
    }

    const key = `${classification.kind}|${classification.bucket}|${variantKey}`;
    let group = groups.get(key);
    if (!group) {
      group = { tokens: [], variants, bucket: classification.bucket!, kind: classification.kind };
      groups.set(key, group);
    }
    group.tokens.push(token);
  }

  // Emit unprefixed rules before variant rules so `hover:` wins on hover.
  const ordered = [...groups.values()].sort((a, b) => {
    const av = a.variants.length, bv = b.variants.length;
    if (av !== bv) return av - bv;
    return `${a.kind}|${a.bucket}`.localeCompare(`${b.kind}|${b.bucket}`);
  });

  const blocks: string[] = [];

  // ---- Gradient stops ------------------------------------------------------
  // Emitted from -> via -> to, mirroring Tailwind's own utility order, because
  // `via-*` re-declares `--tw-gradient-stops` and an explicit `to-*` must beat
  // the implicit fade target that `from-*` sets.
  const notExclusions = GRADIENT_EXCLUSIONS.map((c) => `:not([class~="${c}"])`).join('');
  const gradientOrdered = [...gradientGroups.values()].sort((a, b) => {
    const ap = STOP_ORDER.indexOf(a.position), bp = STOP_ORDER.indexOf(b.position);
    if (ap !== bp) return ap - bp;
    if (a.variants.length !== b.variants.length) return a.variants.length - b.variants.length;
    return a.bucket.localeCompare(b.bucket);
  });
  for (const group of gradientOrdered) {
    const color = bucketColor(group.bucket);
    if (!color) throw new Error(`Gradient stop bucket has no colour: ${group.bucket}`);
    const { prefix, pseudo, media } = resolveVariants(group.variants);
    const selector =
      `${prefix}${SCOPE} ${tokenSelector([...group.tokens].sort())}${notExclusions}${pseudo}`;
    const indent = media ? '  ' : '';
    const text = rule(selector, gradientStopDeclarations(group.position, color), indent);
    blocks.push(media ? `@media ${media} {\n${text}\n}` : text);
  }

  // ---- Everything else -----------------------------------------------------
  for (const group of ordered) {
    const spec = bucketSpec(group.bucket);
    const { prefix, pseudo, media } = resolveVariants(group.variants);
    let element = tokenSelector([...group.tokens].sort());
    if (group.kind === 'border-width' && borderColorTokens.size) {
      // Bare `border` / `border-b` take Tailwind's light default colour, but an
      // unconditional override would also crush `border-b border-red-500`.
      element += [...borderColorTokens].sort().map((t) => `:not([class~="${cssEscape(t)}"])`).join('');
    }
    const selector = `${prefix}${SCOPE} ${element}${pseudo}${spec.suffix ?? ''}`;
    const indent = media ? '  ' : '';
    const text = rule(selector, spec.declarations, indent);
    blocks.push(media ? `@media ${media} {\n${text}\n}` : text);
  }

  const header = [
    GENERATED_START,
    `/* ${darkened.length} light utilities darkened, ${preserved.length} deliberately preserved. */`,
  ].join('\n');

  return {
    css: `${header}\n\n${blocks.join('\n\n')}\n\n${GENERATED_END}`,
    darkened: darkened.sort(),
    preserved,
  };
}

/** Extracts the generated block from a globals.css body, or null if absent. */
export function extractGeneratedBlock(css: string): string | null {
  const start = css.indexOf(GENERATED_START);
  const end = css.indexOf(GENERATED_END);
  if (start === -1 || end === -1) return null;
  return css.slice(start, end + GENERATED_END.length);
}
