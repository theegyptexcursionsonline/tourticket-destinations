import {
  CATEGORY_KEYWORD_MAX_LENGTH,
  normalizeCategoryKeywords,
} from '@/lib/content/categoryKeywords';

describe('normalizeCategoryKeywords', () => {
  it('includes a visible draft when the form is saved without pressing Enter', () => {
    expect(normalizeCategoryKeywords(['egypt tours'], 'family excursions')).toEqual({
      keywords: ['egypt tours', 'family excursions'],
      invalidKeywords: [],
    });
  });

  it('accepts comma and newline separated drafts and removes case-insensitive duplicates', () => {
    expect(normalizeCategoryKeywords(
      ['Orange Bay', null, 42],
      'orange bay, Giftun Island\nboat trip',
    )).toEqual({
      keywords: ['Orange Bay', 'Giftun Island', 'boat trip'],
      invalidKeywords: [],
    });
  });

  it('reports overlong keywords instead of silently dropping the whole save', () => {
    const tooLong = 'x'.repeat(CATEGORY_KEYWORD_MAX_LENGTH + 1);
    expect(normalizeCategoryKeywords(['valid'], tooLong)).toEqual({
      keywords: ['valid'],
      invalidKeywords: [tooLong],
    });
  });
});
