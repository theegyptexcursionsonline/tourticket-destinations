import {
  ARBITRARY_HEX_LIGHT_LUMINANCE,
  WHITE_ALPHA_DARKEN_THRESHOLD,
  bucketColor,
  bucketSpec,
  classifyUtility,
  gradientStopDeclarations,
  isBorderColorUtility,
  relativeLuminance,
  splitVariants,
  tailwindColorOf,
  chroma,
} from '../darkSurfaceMap';
import { UnsupportedVariantError, resolveVariants } from '../buildDarkThemeCss';

describe('splitVariants', () => {
  it('separates a variant chain from the base utility', () => {
    expect(splitVariants('md:hover:bg-white')).toEqual({ variants: ['md', 'hover'], base: 'bg-white' });
    expect(splitVariants('bg-white')).toEqual({ variants: [], base: 'bg-white' });
  });

  it('does not split inside arbitrary-value brackets', () => {
    expect(splitVariants('bg-[url(https://x/y.png)]').base).toBe('bg-[url(https://x/y.png)]');
    expect(splitVariants('hover:bg-[#f7f4ee]')).toEqual({ variants: ['hover'], base: 'bg-[#f7f4ee]' });
  });
});

describe('classifyUtility — backgrounds', () => {
  it('maps the neutral surface ladder', () => {
    expect(classifyUtility('bg-white')?.bucket).toBe('surface-white');
    expect(classifyUtility('bg-slate-50')?.bucket).toBe('surface-50');
    expect(classifyUtility('bg-gray-100')?.bucket).toBe('surface-100');
    expect(classifyUtility('bg-stone-300')?.bucket).toBe('surface-300');
  });

  it('keeps hue tints distinguishable rather than collapsing to grey', () => {
    const red = bucketColor(classifyUtility('bg-red-50')!.bucket!);
    const green = bucketColor(classifyUtility('bg-green-50')!.bucket!);
    expect(red).not.toBe(green);
    expect(relativeLuminance(red!)).toBeLessThan(0.1);
    expect(relativeLuminance(green!)).toBeLessThan(0.1);
  });

  it('preserves low-alpha white glass but darkens opaque panels', () => {
    const glass = classifyUtility(`bg-white/${WHITE_ALPHA_DARKEN_THRESHOLD - 10}`);
    expect(glass?.action).toBe('preserve');
    expect(glass?.reason).toMatch(/imagery/);

    const panel = classifyUtility(`bg-white/${WHITE_ALPHA_DARKEN_THRESHOLD}`);
    expect(panel?.action).toBe('darken');
    expect(bucketColor(panel!.bucket!)).toBe('rgb(17 24 39 / 0.4)');
  });

  it('classifies arbitrary hex by luminance so brand colours survive', () => {
    expect(relativeLuminance('#f7f4ee')).toBeGreaterThanOrEqual(ARBITRARY_HEX_LIGHT_LUMINANCE);
    expect(classifyUtility('bg-[#f7f4ee]')?.action).toBe('darken');
    expect(classifyUtility('bg-[#4385F6]')?.action).toBe('preserve');
    expect(classifyUtility('from-[#4385F6]')?.action).toBe('preserve');
  });

  it('darkens all-light arbitrary gradients but preserves mixed brand gradients', () => {
    expect(
      classifyUtility('bg-[linear-gradient(180deg,#fff7f5_0%,#ffffff_28%,#fffdf8_100%)]'),
    ).toMatchObject({ action: 'darken', bucket: 'surface-gradient' });
    expect(
      classifyUtility('bg-[linear-gradient(180deg,#ffffff_0%,#4385F6_100%)]'),
    ).toMatchObject({ action: 'preserve' });
  });

  it('leaves saturated backgrounds untouched', () => {
    expect(classifyUtility('bg-red-600')).toBeNull();
    expect(classifyUtility('bg-blue-500')).toBeNull();
  });
});

describe('classifyUtility — gradients, text, borders', () => {
  it('treats gradient direction as colourless', () => {
    expect(classifyUtility('bg-gradient-to-br')).toBeNull();
  });

  it('darkens light gradient stops but not shine sweeps', () => {
    expect(classifyUtility('from-white')?.action).toBe('darken');
    expect(classifyUtility('via-slate-50')?.action).toBe('darken');
    expect(classifyUtility('to-gray-50')?.action).toBe('darken');
    expect(classifyUtility('via-white/20')?.action).toBe('preserve');
  });

  it('lightens dark text across the shade ladder', () => {
    expect(classifyUtility('text-black')?.bucket).toBe('text-strong');
    expect(classifyUtility('text-slate-900')?.bucket).toBe('text-strong');
    expect(classifyUtility('text-gray-700')?.bucket).toBe('text-muted');
    expect(classifyUtility('text-slate-400')?.bucket).toBe('text-subtle');
    expect(classifyUtility('text-white')).toBeNull();
  });

  it('preserves white borders and rings used as CTA and glass edges', () => {
    expect(classifyUtility('border-white')?.action).toBe('preserve');
    expect(classifyUtility('border-white/20')?.action).toBe('preserve');
    expect(classifyUtility('ring-white/30')?.action).toBe('preserve');
    expect(classifyUtility('border-slate-200')?.action).toBe('darken');
  });

  it('recognises bare border widths that inherit Tailwind default colour', () => {
    for (const token of ['border', 'border-b', 'border-t', 'border-2', 'border-y']) {
      expect(classifyUtility(token)).toMatchObject({ kind: 'border-width', bucket: 'border' });
    }
  });

  it('identifies border colour utilities that must be excluded', () => {
    expect(isBorderColorUtility('border-red-500')).toBe(true);
    expect(isBorderColorUtility('border-white')).toBe(true);
    expect(isBorderColorUtility('border-b')).toBe(false);
    expect(isBorderColorUtility('border-2')).toBe(false);
  });
});

describe('gradient stop declarations', () => {
  it('recolors the stop while leaving direction and fade target to Tailwind', () => {
    const from = gradientStopDeclarations('from', '#111827');
    expect(from[0]).toBe('--tw-gradient-from: #111827 var(--tw-gradient-from-position)');
    // Fades must interpolate through transparent dark, not transparent white,
    // or a `from-white to-transparent` mask leaves a pale haze mid-gradient.
    expect(from[1]).toContain('rgb(17 24 39 / 0)');
  });

  it('re-declares the stop list for via, which Tailwind inlines literally', () => {
    const via = gradientStopDeclarations('via', '#0f172a');
    expect(via.join(' ')).toContain('--tw-gradient-stops: var(--tw-gradient-from), #0f172a var(--tw-gradient-via-position)');
  });

  it('sets only the end colour for to', () => {
    expect(gradientStopDeclarations('to', '#1e293b')).toEqual([
      '--tw-gradient-to: #1e293b var(--tw-gradient-to-position)',
    ]);
  });
});

describe('resolveVariants', () => {
  it('maps responsive variants to media queries', () => {
    expect(resolveVariants(['md'])).toEqual({ prefix: '', pseudo: '', media: '(min-width: 768px)' });
  });

  it('maps state variants to pseudo-classes and ancestors', () => {
    expect(resolveVariants(['hover']).pseudo).toBe(':hover');
    expect(resolveVariants(['group-hover']).prefix).toBe('.group:hover ');
    expect(resolveVariants(['placeholder']).pseudo).toBe('::placeholder');
    expect(resolveVariants(['md', 'hover'])).toEqual({
      prefix: '', pseudo: ':hover', media: '(min-width: 768px)',
    });
  });

  it('fails loudly on a variant dark mode does not handle yet', () => {
    // Silence here would mean a hover/focus state quietly staying light.
    expect(() => resolveVariants(['supports-[backdrop-filter]'])).toThrow(UnsupportedVariantError);
  });
});

describe('tailwindColorOf / chroma', () => {
  it('resolves real Tailwind palette colours', () => {
    // If this ever returned null the mixed-gradient invariant test would pass
    // vacuously, so assert the resolution actually works.
    expect(tailwindColorOf('to-blue-600')).toBe('#2563eb');
    expect(tailwindColorOf('from-slate-400')).toBe('#94a3b8');
    expect(tailwindColorOf('bg-white')).toBeNull();
    expect(tailwindColorOf('flex')).toBeNull();
  });

  it('separates pale surface tints from saturated brand colours', () => {
    expect(chroma(tailwindColorOf('to-blue-600')!)).toBeGreaterThan(0.35);
    expect(chroma(tailwindColorOf('from-blue-100')!)).toBeLessThan(0.35);
    // A mid neutral is low-chroma, so it is not treated as a brand stop.
    expect(chroma(tailwindColorOf('to-slate-400')!)).toBeLessThan(0.35);
  });
});

describe('bucketSpec', () => {
  it('emits the right property per bucket kind', () => {
    expect(bucketSpec('surface-white').declarations).toEqual(['background-color: #111827']);
    expect(bucketSpec('text-strong').declarations).toEqual(['color: #f8fafc']);
    expect(bucketSpec('ring').declarations).toEqual(['--tw-ring-color: #334155']);
    expect(bucketSpec('divide').suffix).toBe(' > :not([hidden]) ~ :not([hidden])');
    expect(bucketSpec('placeholder').suffix).toBe('::placeholder');
    expect(bucketSpec('surface-gradient').declarations[0]).toContain('background-image: linear-gradient');
  });

  it('rejects an unknown bucket instead of emitting nothing', () => {
    expect(() => bucketSpec('nope')).toThrow(/Unknown dark-theme bucket/);
  });
});
