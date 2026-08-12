/**
 * Single source of truth for the storefront dark-theme override layer.
 *
 * WHY THIS EXISTS
 * The storefront has ~180 component files written against light Tailwind
 * utilities. Retrofitting a `dark:` variant onto every one of them is not
 * tractable, so dark mode is an override layer keyed off the light utilities
 * the markup already uses (see the generated block in app/globals.css).
 *
 * The failure mode of that approach is silent gaps: any light utility nobody
 * remembered to enumerate ships as a white patch in dark mode. That is exactly
 * how `featured-tours` (`from-white to-gray-50`) and `interest-grid`
 * (`from-white via-slate-50 to-white`) regressed — `background-color` was
 * overridden but the Tailwind gradient `background-image` was not.
 *
 * So the override CSS is GENERATED from the utilities actually present in
 * storefront source (scripts/generate-dark-theme-css.ts), and
 * __tests__/storefront-theme-contract.test.ts re-derives the same inventory and
 * fails when a utility is used without a corresponding override. Adding a new
 * light utility to a component now breaks the build instead of the storefront.
 *
 * NOT EVERYTHING LIGHT SHOULD DARKEN. Three families are deliberately
 * preserved, each verified against real usage in this repo:
 *   - low-alpha white (`bg-white/10`, `border-white/20`): glass chips and
 *     dividers that sit on hero imagery and already read correctly on dark.
 *   - opaque `border-white`: dominated by outline CTAs over hero photos
 *     (`border-2 border-white text-white`); darkening erases the button.
 *   - saturated arbitrary hex (`from-[#4385F6]`): brand gradients, not surfaces.
 * Gradients additionally skip `bg-clip-text`, where the gradient paints the
 * headline itself on top of hero photography.
 *
 * Gradient stops are recoloured through Tailwind's own `--tw-gradient-*`
 * variables rather than by replacing `background-image`. Position matters:
 * `absolute inset-0 bg-gradient-to-t from-white to-transparent` is a scroll-fade
 * mask, and flattening it to an opaque panel would hide the content beneath it.
 */

export type UtilityKind =
  | 'background'
  | 'gradient-stop'
  | 'text'
  | 'border-color'
  | 'border-width'
  | 'ring'
  | 'divide'
  | 'placeholder';

export interface Classification {
  /** Base token with variants stripped, e.g. `bg-slate-50`. */
  token: string;
  kind: UtilityKind;
  action: 'darken' | 'preserve';
  /** Declaration bucket, set when action === 'darken'. */
  bucket: string | null;
  /** Human-readable justification, surfaced in contract-test failures. */
  reason?: string;
}

export const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;

export const HUES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const;

/** Below this alpha, white utilities are glass on imagery and are preserved. */
export const WHITE_ALPHA_DARKEN_THRESHOLD = 40;

/** Arbitrary hex at or above this relative luminance counts as a light surface. */
export const ARBITRARY_HEX_LIGHT_LUMINANCE = 0.75;

const NEUTRAL_RE = NEUTRALS.join('|');
const HUE_RE = HUES.join('|');

/**
 * Dark tints for pale (`-50`/`-100`/`-200`) hue panels. Kept hue-bearing on
 * purpose so a `bg-red-50` error panel and a `bg-green-50` success panel stay
 * distinguishable in dark mode instead of collapsing to one neutral grey.
 */
export const HUE_TINTS: Record<string, { 50: string; 100: string; 200: string }> = {
  red:     { 50: '#2a1518', 100: '#3a1c20', 200: '#4a2429' },
  orange:  { 50: '#2a1c12', 100: '#3a271a', 200: '#4a3222' },
  amber:   { 50: '#2a2112', 100: '#3a2e19', 200: '#4a3b21' },
  yellow:  { 50: '#282413', 100: '#38321b', 200: '#484023' },
  lime:    { 50: '#1e2712', 100: '#2a3519', 200: '#364321' },
  green:   { 50: '#12251a', 100: '#193324', 200: '#20412e' },
  emerald: { 50: '#0f2620', 100: '#16342c', 200: '#1d4238' },
  teal:    { 50: '#0f2528', 100: '#163336', 200: '#1d4144' },
  cyan:    { 50: '#0f2429', 100: '#163238', 200: '#1d4047' },
  sky:     { 50: '#0f2130', 100: '#162e42', 200: '#1d3b54' },
  blue:    { 50: '#131f33', 100: '#1b2c47', 200: '#23395b' },
  indigo:  { 50: '#1a1a35', 100: '#252549', 200: '#30305d' },
  violet:  { 50: '#1f1836', 100: '#2b224a', 200: '#372c5e' },
  purple:  { 50: '#221634', 100: '#301f48', 200: '#3e285c' },
  fuchsia: { 50: '#2a1430', 100: '#3a1c42', 200: '#4a2454' },
  pink:    { 50: '#2a1424', 100: '#3a1c31', 200: '#4a243e' },
  rose:    { 50: '#2a1520', 100: '#3a1d2c', 200: '#4a2538' },
};

/** Neutral surface ladder: lighter Tailwind shade -> darker replacement. */
export const NEUTRAL_SURFACES: Record<string, string> = {
  white: '#111827',
  50: '#0f172a',
  100: '#1e293b',
  200: '#1e293b',
  300: '#334155',
};

export const DARK_SURFACE_BASE = '17 24 39';
export const DARK_BORDER = '#334155';
export const TEXT_STRONG = '#f8fafc';
export const TEXT_MUTED = '#cbd5e1';
export const TEXT_SUBTLE = '#94a3b8';

/** Fully transparent form of the dark surface, used as a gradient fade target. */
export const DARK_TRANSPARENT = `rgb(${DARK_SURFACE_BASE} / 0)`;

/** Resolves a surface bucket to a single CSS colour, or null for non-surfaces. */
export function bucketColor(bucket: string): string | null {
  if (bucket.startsWith('surface-alpha-')) {
    const alpha = Number(bucket.slice('surface-alpha-'.length));
    return `rgb(${DARK_SURFACE_BASE} / ${alpha / 100})`;
  }
  if (bucket.startsWith('tint-')) {
    const [, hue, shade] = bucket.split('-');
    return HUE_TINTS[hue][Number(shade) as 50 | 100 | 200];
  }
  if (bucket.startsWith('surface-')) return NEUTRAL_SURFACES[bucket.slice('surface-'.length)];
  return null;
}

/** CSS emitted for each bucket. `suffix` extends the element selector. */
export interface BucketSpec {
  declarations: string[];
  suffix?: string;
}

export function bucketSpec(bucket: string): BucketSpec {
  const surface = bucketColor(bucket);
  if (surface) return { declarations: [`background-color: ${surface}`] };
  switch (bucket) {
    case 'text-strong': return { declarations: [`color: ${TEXT_STRONG}`] };
    case 'text-muted': return { declarations: [`color: ${TEXT_MUTED}`] };
    case 'text-subtle': return { declarations: [`color: ${TEXT_SUBTLE}`] };
    case 'border': return { declarations: [`border-color: ${DARK_BORDER}`] };
    case 'ring': return { declarations: [`--tw-ring-color: ${DARK_BORDER}`] };
    case 'divide': return { declarations: [`border-color: ${DARK_BORDER}`], suffix: ' > :not([hidden]) ~ :not([hidden])' };
    case 'placeholder': return { declarations: [`color: ${TEXT_SUBTLE}`], suffix: '::placeholder' };
    case 'surface-gradient': return {
      declarations: ['background-image: linear-gradient(180deg, #0f172a 0%, #111827 50%, #0f172a 100%)'],
    };
    default: throw new Error(`Unknown dark-theme bucket: ${bucket}`);
  }
}

/**
 * Declarations that recolour one Tailwind gradient stop.
 *
 * Tailwind v3 builds gradients from custom properties, so overriding the stop
 * colours leaves direction, stop positions and `to-transparent` fades intact.
 * Replacing `background-image` wholesale does not: it turns a scroll-fade mask
 * (`bg-gradient-to-t from-white to-transparent`) into an opaque slab that hides
 * the content underneath.
 *
 * `via-*` must re-declare `--tw-gradient-stops` because Tailwind inlines the via
 * colour there as a literal rather than behind a variable.
 */
export function gradientStopDeclarations(position: 'from' | 'via' | 'to', color: string): string[] {
  switch (position) {
    case 'from':
      return [
        `--tw-gradient-from: ${color} var(--tw-gradient-from-position)`,
        `--tw-gradient-to: ${DARK_TRANSPARENT} var(--tw-gradient-to-position)`,
      ];
    case 'via':
      return [
        `--tw-gradient-to: ${DARK_TRANSPARENT} var(--tw-gradient-to-position)`,
        `--tw-gradient-stops: var(--tw-gradient-from), ${color} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
      ];
    case 'to':
      return [`--tw-gradient-to: ${color} var(--tw-gradient-to-position)`];
  }
}

/** WCAG relative luminance, used to tell light surfaces from brand colours. */
export function relativeLuminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return 0;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Colourfulness (max channel − min channel, 0–1). Separates a pale surface tint
 * such as `blue-100` (~0.14) from a saturated brand colour such as `blue-600`
 * (~0.72), which relative luminance alone cannot do.
 */
export function chroma(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length < 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/** Resolves a colour-bearing utility (`to-blue-600`) to its Tailwind hex. */
export function tailwindColorOf(base: string): string | null {
  const match = /^(?:bg|text|border|ring|divide|from|via|to)-([a-z]+)-(\d{2,3})(?:\/\d{1,3})?$/.exec(base);
  if (!match) return null;
  const palette = require('tailwindcss/colors') as Record<string, Record<string, string>>;
  const value = palette[match[1]]?.[match[2]];
  return typeof value === 'string' && value.startsWith('#') ? value : null;
}

/** Splits `md:hover:bg-white` into its variant chain and base utility. */
export function splitVariants(token: string): { variants: string[]; base: string } {
  let depth = 0;
  const parts: string[] = [];
  let current = '';
  for (const ch of token) {
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (ch === ':' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  return { variants: parts, base: current };
}

const RE = {
  bgWhite: /^bg-white(?:\/(\d{1,3}))?$/,
  bgNeutral: new RegExp(`^bg-(?:${NEUTRAL_RE})-(50|100|200|300)(?:\\/(\\d{1,3}))?$`),
  bgHue: new RegExp(`^bg-(${HUE_RE})-(50|100|200)(?:\\/(\\d{1,3}))?$`),
  bgHex: /^bg-\[#([0-9a-fA-F]{3,8})\]$/,
  bgArbitraryGradient: /^bg-\[(linear-gradient\(.+\))\]$/,
  stopWhite: /^(?:from|via|to)-white(?:\/(\d{1,3}))?$/,
  stopNeutral: new RegExp(`^(?:from|via|to)-(?:${NEUTRAL_RE})-(50|100|200|300)(?:\\/(\\d{1,3}))?$`),
  stopHue: new RegExp(`^(?:from|via|to)-(${HUE_RE})-(50|100|200)(?:\\/(\\d{1,3}))?$`),
  stopHex: /^(?:from|via|to)-\[#([0-9a-fA-F]{3,8})\]$/,
  gradientDir: /^bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)$/,
  text: new RegExp(`^text-(black|(?:${NEUTRAL_RE})-(400|500|600|700|800|900|950))(?:\\/\\d{1,3})?$`),
  borderWhite: /^border-white(?:\/(\d{1,3}))?$/,
  borderNeutral: new RegExp(`^border-(?:${NEUTRAL_RE})-(?:50|100|200|300)(?:\\/\\d{1,3})?$`),
  borderWidth: /^border(?:-[xytrbles])?(?:-(?:0|2|4|8))?$/,
  ringLight: new RegExp(`^ring-(?:(?:${NEUTRAL_RE})-(?:50|100|200|300))(?:\\/\\d{1,3})?$`),
  ringWhite: /^ring-white(?:\/\d{1,3})?$/,
  divideLight: new RegExp(`^divide-(?:${NEUTRAL_RE})-(?:50|100|200|300)(?:\\/\\d{1,3})?$`),
  divideWhite: /^divide-white(?:\/\d{1,3})?$/,
  placeholder: new RegExp(`^placeholder-(?:${NEUTRAL_RE})-(?:300|400|500)$`),
};

function alphaBucket(alphaRaw: string | undefined): string {
  const alpha = alphaRaw ? Number(alphaRaw) : 100;
  return alpha >= 100 ? 'surface-white' : `surface-alpha-${alpha}`;
}

/**
 * Classifies one variant-stripped Tailwind token. Returns null for tokens the
 * dark layer does not care about (saturated brand colours, layout, spacing).
 */
export function classifyUtility(base: string): Classification | null {
  const mk = (
    kind: UtilityKind,
    action: 'darken' | 'preserve',
    bucket: string | null,
    reason?: string,
  ): Classification => ({ token: base, kind, action, bucket, reason });

  let m: RegExpExecArray | null;

  if ((m = RE.bgWhite.exec(base))) {
    const alpha = m[1] ? Number(m[1]) : 100;
    if (alpha < WHITE_ALPHA_DARKEN_THRESHOLD) {
      return mk('background', 'preserve', null, 'low-alpha white glass sits on hero imagery');
    }
    return mk('background', 'darken', alphaBucket(m[1]));
  }
  if ((m = RE.bgNeutral.exec(base))) {
    return mk('background', 'darken', m[2] ? `surface-alpha-${m[2]}` : `surface-${m[1]}`);
  }
  if ((m = RE.bgHue.exec(base))) {
    return mk('background', 'darken', m[3] ? `surface-alpha-${m[3]}` : `tint-${m[1]}-${m[2]}`);
  }
  if ((m = RE.bgHex.exec(base))) {
    return relativeLuminance(m[1]) >= ARBITRARY_HEX_LIGHT_LUMINANCE
      ? mk('background', 'darken', 'surface-white')
      : mk('background', 'preserve', null, 'saturated arbitrary hex is a brand colour, not a surface');
  }
  if ((m = RE.bgArbitraryGradient.exec(base))) {
    const hexColors = [...m[1].matchAll(/#([0-9a-fA-F]{3,8})/g)].map((match) => match[1]);
    const hasWhiteKeyword = /(?:^|[,_(])white(?:[,_)%]|$)/i.test(m[1]);
    const hasColors = hexColors.length > 0 || hasWhiteKeyword;
    const allLight = hexColors.every(
      (hex) => relativeLuminance(hex) >= ARBITRARY_HEX_LIGHT_LUMINANCE,
    );
    return hasColors && allLight
      ? mk('background', 'darken', 'surface-gradient')
      : mk('background', 'preserve', null, 'mixed or saturated arbitrary gradient is a brand treatment');
  }

  if ((m = RE.stopWhite.exec(base))) {
    const alpha = m[1] ? Number(m[1]) : 100;
    return alpha < WHITE_ALPHA_DARKEN_THRESHOLD
      ? mk('gradient-stop', 'preserve', null, 'low-alpha white gradient is a shine/sweep overlay')
      : mk('gradient-stop', 'darken', alphaBucket(m[1]));
  }
  if ((m = RE.stopNeutral.exec(base))) {
    return mk('gradient-stop', 'darken', m[2] ? `surface-alpha-${m[2]}` : `surface-${m[1]}`);
  }
  if ((m = RE.stopHue.exec(base))) {
    return mk('gradient-stop', 'darken', m[3] ? `surface-alpha-${m[3]}` : `tint-${m[1]}-${m[2]}`);
  }
  if ((m = RE.stopHex.exec(base))) {
    return relativeLuminance(m[1]) >= ARBITRARY_HEX_LIGHT_LUMINANCE
      ? mk('gradient-stop', 'darken', 'surface-white')
      : mk('gradient-stop', 'preserve', null, 'saturated arbitrary hex is a brand gradient');
  }
  if (RE.gradientDir.test(base)) {
    // Direction carries no colour — the stops do. Nothing to override.
    return null;
  }

  if ((m = RE.text.exec(base))) {
    const shade = m[2] ? Number(m[2]) : 900;
    const bucket = shade >= 800 ? 'text-strong' : shade >= 600 ? 'text-muted' : 'text-subtle';
    return mk('text', 'darken', bucket);
  }

  if ((m = RE.borderWhite.exec(base))) {
    return mk('border-color', 'preserve', null, 'white borders are outline CTAs and glass edges on imagery');
  }
  if (RE.borderNeutral.test(base)) return mk('border-color', 'darken', 'border');
  if (RE.borderWidth.test(base)) return mk('border-width', 'darken', 'border');

  if (RE.ringWhite.test(base)) return mk('ring', 'preserve', null, 'white ring is a focus/brand accent on imagery');
  if (RE.ringLight.test(base)) return mk('ring', 'darken', 'ring');

  if (RE.divideWhite.test(base)) return mk('divide', 'preserve', null, 'white divider sits on imagery');
  if (RE.divideLight.test(base)) return mk('divide', 'darken', 'divide');

  if (RE.placeholder.test(base)) return mk('placeholder', 'darken', 'placeholder');

  return null;
}

/**
 * Border-colour utilities that must be excluded from the bare `border-width`
 * rule, otherwise an unconditional `border-color` would crush explicit colours
 * such as `border-b border-red-500`.
 */
export function isBorderColorUtility(base: string): boolean {
  return /^border-(?:white|black|transparent|current|inherit|\[|(?:[a-z]+)-\d{2,3})(?:\/\d{1,3})?$/.test(base);
}

/** Tailwind's default responsive breakpoints, for variant-aware rule emission. */
export const BREAKPOINTS: Record<string, string> = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
};

/** State variants worth re-emitting; anything else is skipped as unsupported. */
export const STATE_VARIANTS: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  'focus-visible': ':focus-visible',
  'focus-within': ':focus-within',
  active: ':active',
  disabled: ':disabled',
  'group-hover': '', // handled via .group:hover ancestor
  'peer-focus': '',
};
