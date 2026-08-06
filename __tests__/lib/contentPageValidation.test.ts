import {
  contentPageDraftDefaults,
  contentPageValidationFields,
  missingContentPageFields,
} from '@/lib/admin/contentPageValidation';
import fs from 'node:fs';

const minimalCategoryPage = {
  tenantId: 'marsa-alam-excursions',
  title: 'QA Category 2',
  slug: 'qa-category-2',
  description: 'A reversible test page.',
  pageType: 'category',
  categoryId: '64b64c9bfc13ae1f19e8a001',
  isPublished: false,
};

describe('content page draft validation', () => {
  it('allows a Category 2 draft without hidden Media or Grid-tab prerequisites', () => {
    expect(missingContentPageFields(minimalCategoryPage)).toEqual([]);
    expect(contentPageDraftDefaults(minimalCategoryPage)).toEqual({
      gridTitle: 'QA Category 2',
    });
  });

  it('keeps the Category association mandatory for Category 2 drafts', () => {
    expect(missingContentPageFields({
      ...minimalCategoryPage,
      categoryId: '',
    })).toContain('Category');
  });

  it('requires hero media before publication but not before draft creation', () => {
    expect(missingContentPageFields({
      ...minimalCategoryPage,
      isPublished: true,
    })).toContain('Hero Image');
    expect(missingContentPageFields({
      ...minimalCategoryPage,
      isPublished: true,
      heroImage: 'https://images.example.test/category.jpg',
    })).not.toContain('Hero Image');
  });

  it('requires an exact brand and a city owner when those scopes apply', () => {
    const fields = contentPageValidationFields({
      ...minimalCategoryPage,
      tenantId: ' ',
      urlType: 'city',
      cityDestination: '',
    });
    expect(fields.filter((field) => !field.complete).map((field) => field.label))
      .toEqual(['Brand', 'City']);
  });

  it('preserves authored grid copy instead of replacing it', () => {
    expect(contentPageDraftDefaults({
      title: 'QA Category 2',
      gridTitle: 'Hand-picked Marsa Alam tours',
    })).toEqual({ gridTitle: 'Hand-picked Marsa Alam tours' });
  });

  it('keeps the form and shared validation on the same draft contract', () => {
    const form = fs.readFileSync('components/admin/AttractionPageForm.tsx', 'utf8');
    expect(form).toContain('missingRequiredFields.length > 0');
    expect(form).toContain('required={formData.isPublished}>Hero Image');
    expect(form).toContain('If blank, the page title is used.');
    expect(form).not.toContain('!formData.heroImage ||');
    expect(form).not.toContain('!formData.gridTitle?.trim()');
  });
});
