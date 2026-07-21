import {
  buildTranslationLengthInstruction,
  enforceTranslationFieldLimits,
} from '@/lib/i18n/translationLimits';
import { attractionPageTranslationFields } from '@/lib/i18n/translationFields';

describe('translation field limits', () => {
  it('keeps generated page translations within the UI and schema limits', () => {
    const translated = enforceTranslationFieldLimits({
      metaTitle: 'Pferdetest-Kategorie - Entdecken Sie einzigartige Erlebnisse',
      metaDescription: 'x'.repeat(200),
      highlights: ['y'.repeat(240)],
      unexpected: 'discard me',
    }, attractionPageTranslationFields);

    expect(String(translated.metaTitle).length).toBeLessThanOrEqual(60);
    expect(String(translated.metaDescription).length).toBeLessThanOrEqual(160);
    expect((translated.highlights as string[])[0]).toHaveLength(200);
    expect(translated).not.toHaveProperty('unexpected');
  });

  it('adds explicit limits to the translation prompt', () => {
    const instruction = buildTranslationLengthInstruction(attractionPageTranslationFields);
    expect(instruction).toContain('metaTitle: 60 characters');
    expect(instruction).toContain('metaDescription: 160 characters');
  });
});
