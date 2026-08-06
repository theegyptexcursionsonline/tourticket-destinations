export interface ContentPageDraftInput {
  tenantId?: unknown;
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  pageType?: unknown;
  categoryId?: unknown;
  urlType?: unknown;
  cityDestination?: unknown;
  heroImage?: unknown;
  isPublished?: unknown;
  gridTitle?: unknown;
}

export interface ContentPageValidationField {
  key: keyof ContentPageDraftInput;
  label: string;
  complete: boolean;
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Shared create/edit validation for Attraction and Category 2 pages.
 *
 * A draft only needs enough information to identify it and, for Category 2,
 * its tenant-owned Category association. Media is mandatory at publication
 * time because both storefront templates render a hero image.
 */
export function contentPageValidationFields(
  input: ContentPageDraftInput,
): ContentPageValidationField[] {
  const fields: ContentPageValidationField[] = [
    { key: 'tenantId', label: 'Brand', complete: hasText(input.tenantId) },
    { key: 'title', label: 'Title', complete: hasText(input.title) },
    { key: 'slug', label: 'URL Slug', complete: hasText(input.slug) },
    { key: 'description', label: 'Description', complete: hasText(input.description) },
    { key: 'pageType', label: 'Page Type', complete: hasText(input.pageType) },
  ];

  if (input.pageType === 'category') {
    fields.push({ key: 'categoryId', label: 'Category', complete: hasText(input.categoryId) });
  }

  if (input.urlType === 'city') {
    fields.push({ key: 'cityDestination', label: 'City', complete: hasText(input.cityDestination) });
  }

  if (Boolean(input.isPublished)) {
    fields.push({ key: 'heroImage', label: 'Hero Image', complete: hasText(input.heroImage) });
  }

  return fields;
}

export function missingContentPageFields(input: ContentPageDraftInput): string[] {
  return contentPageValidationFields(input)
    .filter((field) => !field.complete)
    .map((field) => field.label);
}

/**
 * The grid heading is required by the stored schema, but it is editable copy,
 * not a prerequisite for saving a draft. Give new minimal drafts a truthful,
 * visible default instead of blocking the form on a different tab.
 */
export function contentPageDraftDefaults(
  input: Pick<ContentPageDraftInput, 'title' | 'gridTitle'>,
): { gridTitle: string } {
  const gridTitle = hasText(input.gridTitle)
    ? String(input.gridTitle).trim()
    : hasText(input.title)
      ? String(input.title).trim()
      : '';

  return { gridTitle };
}
