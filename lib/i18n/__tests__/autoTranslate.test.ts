/**
 * Regression coverage for the 2026-07-20 auto-translate hardening:
 * - saves are per-locale ($set: translations.<locale>) so a partial run can
 *   never wipe other locales or manual translations (whole-map $set bug)
 * - a missing OPENAI_API_KEY or empty model response THROWS instead of
 *   silently returning {} (which the editor showed as success)
 * - locales run independently: one failed locale must not block the others
 */
import { buildTranslationsSetOps, translateEntityFieldsForLocale } from '../autoTranslate';
import { tourTranslationFields, translatableLocales } from '../translationFields';

const mockCreate = jest.fn();
let openAiAvailable = true;

jest.mock('@/lib/openai', () => ({
  getOpenAIClient: jest.fn(() =>
    openAiAvailable ? { chat: { completions: { create: mockCreate } } } : null
  ),
}));

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: jest.fn(),
}));
jest.mock('@/lib/models/Tour', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('@/lib/models/Destination', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('@/lib/models/Category', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const localeTitles: Record<string, string> = {
  ar: 'جولة الأهرام',
  es: 'Tour de Pirámides',
  fr: 'Visite des Pyramides',
  de: 'Pyramiden-Tour',
  ru: 'Тур к пирамидам',
};

/** Answer each per-locale OpenAI call with that locale's fields, matched on the "(code)" phrase. */
function mockPerLocaleResponses(failFor: string[] = []) {
  mockCreate.mockImplementation((req: { messages: { content: string }[] }) => {
    const prompt = req.messages.map((m) => m.content).join('\n');
    const locale = Object.keys(localeTitles).find((code) => prompt.includes(`(${code})`));
    if (locale && failFor.includes(locale)) {
      return Promise.reject(new Error(`simulated ${locale} failure`));
    }
    return Promise.resolve({
      choices: [{ message: { content: JSON.stringify(locale ? { title: localeTitles[locale] } : {}) } }],
    });
  });
}

beforeEach(() => {
  mockCreate.mockReset();
  openAiAvailable = true;
  const Tour = jest.requireMock('@/lib/models/Tour');
  Tour.findById.mockReset();
  Tour.findByIdAndUpdate.mockReset();
});

describe('buildTranslationsSetOps', () => {
  it('emits only per-locale keys — never a whole-map `translations` key', () => {
    const ops = buildTranslationsSetOps({
      ar: { title: localeTitles.ar },
      de: { title: localeTitles.de },
    });
    expect(Object.keys(ops).sort()).toEqual(['translations.ar', 'translations.de']);
    expect(ops).not.toHaveProperty('translations');
    expect(ops['translations.ar']).toEqual({ title: localeTitles.ar });
  });

  it('returns an empty op set for no translations (nothing to overwrite)', () => {
    expect(buildTranslationsSetOps({})).toEqual({});
  });
});

describe('translateEntityFieldsForLocale — fail-loud', () => {
  it('throws when the translation service is not configured (no silent {})', async () => {
    openAiAvailable = false;
    await expect(
      translateEntityFieldsForLocale({ title: 'Pyramid Tour' }, tourTranslationFields, 'tour', 'ar')
    ).rejects.toThrow('OPENAI_API_KEY');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws on an empty model response instead of green-checking nothing', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(
      translateEntityFieldsForLocale({ title: 'Pyramid Tour' }, tourTranslationFields, 'tour', 'ar')
    ).rejects.toThrow();
  });

  it('returns parsed fields for a single locale on success', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ title: localeTitles.ar }) } }],
    });
    const result = await translateEntityFieldsForLocale(
      { title: 'Pyramid Tour' },
      tourTranslationFields,
      'tour',
      'ar'
    );
    expect(result).toEqual({ title: localeTitles.ar });
  });
});

describe('autoTranslateTour — per-locale saves', () => {
  it('saves every translated locale under translations.<locale>', async () => {
    const Tour = jest.requireMock('@/lib/models/Tour');
    Tour.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'tour123', title: 'Pyramid Tour' }),
    });
    Tour.findByIdAndUpdate.mockResolvedValue({});
    mockPerLocaleResponses();

    const { autoTranslateTour } = await import('../autoTranslate');
    await autoTranslateTour('tour123');

    const expectedSet: Record<string, unknown> = {};
    for (const locale of translatableLocales) {
      expectedSet[`translations.${locale}`] = { title: localeTitles[locale] };
    }
    expect(Tour.findByIdAndUpdate).toHaveBeenCalledWith('tour123', { $set: expectedSet });
  });

  it('still saves the locales that succeeded when one locale fails (no all-or-nothing)', async () => {
    const Tour = jest.requireMock('@/lib/models/Tour');
    Tour.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'tour123', title: 'Pyramid Tour' }),
    });
    Tour.findByIdAndUpdate.mockResolvedValue({});
    mockPerLocaleResponses(['ru']);

    const { autoTranslateTour } = await import('../autoTranslate');
    await autoTranslateTour('tour123');

    expect(Tour.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    const setArg = Tour.findByIdAndUpdate.mock.calls[0][1].$set as Record<string, unknown>;
    expect(Object.keys(setArg)).not.toContain('translations');
    expect(Object.keys(setArg)).not.toContain('translations.ru');
    for (const locale of translatableLocales.filter((l: string) => l !== 'ru')) {
      expect(setArg[`translations.${locale}`]).toEqual({ title: localeTitles[locale] });
    }
  });

  it('reports a missing tour instead of returning a false success', async () => {
    const Tour = jest.requireMock('@/lib/models/Tour');
    Tour.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const { autoTranslateTour } = await import('../autoTranslate');
    await expect(autoTranslateTour('nonexistent')).rejects.toThrow('Tour not found');
    expect(Tour.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
