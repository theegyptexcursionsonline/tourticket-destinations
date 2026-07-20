import { Types } from 'mongoose';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { buildStrictTenantQuery } from '@/lib/tenant';

export class PageLinkValidationError extends Error {}

function normalizeIds(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new PageLinkValidationError(`${label} must be an array`);
  const ids = [...new Set(value.map(String))];
  if (ids.length > 100) throw new PageLinkValidationError(`${label} cannot contain more than 100 items`);
  if (ids.some((id) => !Types.ObjectId.isValid(id))) {
    throw new PageLinkValidationError(`${label} contains an invalid item`);
  }
  return ids;
}

export async function validateAndNormalizePageLinks(
  body: Record<string, unknown>,
  tenantId: string,
  currentPageId?: string,
) {
  const includeTours = body.linkedTourIds !== undefined || !currentPageId;
  const includePages = body.linkedPageIds !== undefined || !currentPageId;
  const includeCategories = body.linkedCategoryIds !== undefined || !currentPageId;
  const linkedTourIds = includeTours ? normalizeIds(body.linkedTourIds, 'Tour listings') : [];
  const linkedPageIds = includePages ? normalizeIds(body.linkedPageIds, 'Page listings') : [];
  const linkedCategoryIds = includeCategories ? normalizeIds(body.linkedCategoryIds, 'Category listings') : [];

  if (currentPageId && linkedPageIds.includes(currentPageId)) {
    throw new PageLinkValidationError('A page cannot list itself');
  }

  const [tourCount, pageCount, categoryCount] = await Promise.all([
    linkedTourIds.length
      ? Tour.countDocuments(buildStrictTenantQuery({ _id: { $in: linkedTourIds } }, tenantId))
      : 0,
    linkedPageIds.length
      ? AttractionPage.countDocuments({ _id: { $in: linkedPageIds }, tenantId })
      : 0,
    linkedCategoryIds.length
      ? Category.countDocuments({ _id: { $in: linkedCategoryIds }, tenantId })
      : 0,
  ]);

  if (tourCount !== linkedTourIds.length) {
    throw new PageLinkValidationError('One or more selected tours do not belong to this brand');
  }
  if (pageCount !== linkedPageIds.length) {
    throw new PageLinkValidationError('One or more selected pages do not belong to this brand');
  }
  if (categoryCount !== linkedCategoryIds.length) {
    throw new PageLinkValidationError('One or more selected categories do not belong to this brand');
  }

  return {
    ...(includeTours ? { linkedTourIds } : {}),
    ...(includePages ? { linkedPageIds } : {}),
    ...(includeCategories ? { linkedCategoryIds } : {}),
  };
}
