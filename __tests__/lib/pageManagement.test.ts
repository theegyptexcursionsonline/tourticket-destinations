jest.mock('mongoose', () => {
  class MockObjectId {
    constructor(public value: string) {}
    static isValid(value: unknown) { return /^[a-f\d]{24}$/i.test(String(value)); }
    getTimestamp() { return new Date(0); }
    toString() { return this.value; }
  }
  return { Types: { ObjectId: MockObjectId } };
});
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/openai', () => ({ getOpenAIClient: jest.fn(() => null) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({
    ...query,
    $or: [{ tenantId }, { tenantIds: tenantId }],
  }),
}));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));

import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { pagePath } from '@/lib/attractionPages/pageUrl';
import { buildTranslationsSetOps } from '@/lib/i18n/autoTranslate';
import { attractionPageTranslationFields } from '@/lib/i18n/translationFields';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mockTourCount = jest.requireMock('@/lib/models/Tour').default.countDocuments as jest.Mock;
const mockPageCount = jest.requireMock('@/lib/models/AttractionPage').default.countDocuments as jest.Mock;
const mockCategoryCount = jest.requireMock('@/lib/models/Category').default.countDocuments as jest.Mock;

const tourId = '507f191e810c19729de860ea';
const pageId = '507f191e810c19729de860eb';
const categoryId = '507f191e810c19729de860ec';

describe('unified Pages management helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTourCount.mockResolvedValue(1);
    mockPageCount.mockResolvedValue(1);
    mockCategoryCount.mockResolvedValue(1);
  });

  it('keeps Page Type and URL Type independent', () => {
    expect(pagePath('desert-safari', 'attraction', 'default')).toBe('/attraction/desert-safari');
    expect(pagePath('desert-safari', 'category', 'default')).toBe('/category/desert-safari');
    expect(pagePath('desert-safari', 'attraction', 'category')).toBe('/category/desert-safari');
    expect(pagePath('desert-safari', 'category', 'attraction')).toBe('/attraction/desert-safari');
  });

  it('deduplicates and accepts only linked content from the selected brand', async () => {
    const result = await validateAndNormalizePageLinks({
      linkedTourIds: [tourId, tourId],
      linkedPageIds: [pageId],
      linkedCategoryIds: [categoryId],
    }, 'makadi-bay');

    expect(result).toEqual({
      linkedTourIds: [tourId],
      linkedPageIds: [pageId],
      linkedCategoryIds: [categoryId],
    });
    expect(mockTourCount).toHaveBeenCalledWith(expect.objectContaining({
      _id: { $in: [tourId] },
      $or: [{ tenantId: 'makadi-bay' }, { tenantIds: 'makadi-bay' }],
    }));
    expect(mockPageCount).toHaveBeenCalledWith({ _id: { $in: [pageId] }, tenantId: 'makadi-bay' });
    expect(mockCategoryCount).toHaveBeenCalledWith({ _id: { $in: [categoryId] }, tenantId: 'makadi-bay' });
  });

  it('rejects a cross-brand linked tour and self-linking pages', async () => {
    mockTourCount.mockResolvedValue(0);
    await expect(validateAndNormalizePageLinks({ linkedTourIds: [tourId] }, 'makadi-bay'))
      .rejects.toThrow('do not belong to this brand');
    await expect(validateAndNormalizePageLinks({ linkedPageIds: [pageId] }, 'makadi-bay', pageId))
      .rejects.toBeInstanceOf(PageLinkValidationError);
  });

  it('does not clear link fields omitted from a partial update', async () => {
    await expect(validateAndNormalizePageLinks({ title: 'Updated' }, 'makadi-bay', pageId))
      .resolves.toEqual({});
  });

  it('preserves manual locale buckets and exposes every Page translation field', () => {
    expect(buildTranslationsSetOps({
      de: { title: 'Wüstensafari' },
      ru: { title: 'Сафари' },
    })).toEqual({
      'translations.de': { title: 'Wüstensafari' },
      'translations.ru': { title: 'Сафари' },
    });
    expect(attractionPageTranslationFields.map((field) => field.key)).toEqual(expect.arrayContaining([
      'title', 'description', 'longDescription', 'gridTitle', 'gridSubtitle',
      'highlights', 'features', 'metaTitle', 'metaDescription',
    ]));
  });

  it('keeps legacy editors and exits visually inside unified Pages', () => {
    const header = readFileSync(join(process.cwd(), 'components/admin/Header.tsx'), 'utf8');
    const title = readFileSync(join(process.cwd(), 'components/admin/AdminDocumentTitle.tsx'), 'utf8');
    const categoryForm = readFileSync(join(process.cwd(), 'components/admin/CategoryForm.tsx'), 'utf8');
    expect(header).toContain("segment === 'attraction-pages' || segment === 'categories'");
    expect(header).toContain("? '/admin/pages'");
    expect(title).toContain("attraction-pages(?:\\/|$)/, 'Pages'");
    expect(title).toContain("categories(?:\\/|$)/, 'Pages'");
    expect(categoryForm).toContain("router.push('/admin/pages')");
  });
});
