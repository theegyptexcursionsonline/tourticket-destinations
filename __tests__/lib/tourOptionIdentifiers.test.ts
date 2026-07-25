import {
  collectTourOptionIds,
  findMatchingTourOptionIds,
  matchesTourAdminSearch,
} from '@/lib/admin/tourOptionIdentifiers';

describe('tour option identifiers', () => {
  it('collects stable ids, legacy pricing keys and subdocument ids without duplicates', () => {
    expect(collectTourOptionIds([
      { id: '263173ac-25a6-46ca-a675-ffe907847c12', _id: 'subdoc-1' },
      { pricingKey: 'legacy-key', id: '263173ac-25a6-46ca-a675-ffe907847c12' },
      null,
    ])).toEqual([
      '263173ac-25a6-46ca-a675-ffe907847c12',
      'subdoc-1',
      'legacy-key',
    ]);
  });

  it('matches a complete Option ID case-insensitively and ignores partial ids', () => {
    const options = [{ id: '263173AC-25A6-46CA-A675-FFE907847C12' }];
    expect(findMatchingTourOptionIds(options, '263173ac-25a6-46ca-a675-ffe907847c12'))
      .toEqual(['263173AC-25A6-46CA-A675-FFE907847C12']);
    expect(findMatchingTourOptionIds(options, '263173ac')).toEqual([]);
  });

  it('lets the Tours list find a tour by a partial Option ID', () => {
    const tour = {
      _id: 'tour-1',
      title: 'Network Tour',
      optionIds: ['263173ac-25a6-46ca-a675-ffe907847c12'],
    };
    expect(matchesTourAdminSearch(tour, 'ffe907847c12')).toBe(true);
    expect(matchesTourAdminSearch(tour, 'missing-option')).toBe(false);
  });
});
