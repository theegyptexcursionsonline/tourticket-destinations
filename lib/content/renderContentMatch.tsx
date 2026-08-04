import type React from 'react';
import type { Metadata } from 'next';
import type { ContentMatch } from '@/lib/content/resolveContentBySlug';
import TourDetailPage, { generateMetadata as getTourMetadata } from '@/app/[locale]/[slug]/TourDetailContent';
import { renderDestinationPage, generateMetadata as getDestinationMetadata } from '@/app/[locale]/destinations/[slug]/page';
import { renderCategoryPage, generateMetadata as getCategoryMetadata } from '@/app/[locale]/categories/[slug]/page';
import { renderAttractionPage, generateMetadata as getAttractionMetadata } from '@/app/[locale]/attraction/[slug]/page';
import { renderCataloguePage, generateMetadata as getCatalogueMetadata } from '@/app/[locale]/category/[category-name]/page';

export async function renderContentMatch(match: ContentMatch, locale: string): Promise<React.ReactElement | null> {
  const params = Promise.resolve({ locale, slug: match.slug });
  if (match.type === 'tour') return TourDetailPage({ params });
  if (match.type === 'destination') return renderDestinationPage(match.slug);
  if (match.type === 'category') return renderCategoryPage(match.slug);
  if (match.type === 'page' && match.pageKind === 'category') return renderCataloguePage(match.slug, locale);
  if (match.type === 'page') return renderAttractionPage(match.slug, locale);
  return null;
}

export async function getContentMatchMetadata(match: ContentMatch, locale: string): Promise<Metadata | null> {
  const params = Promise.resolve({ locale, slug: match.slug });
  if (match.type === 'tour') return getTourMetadata({ params });
  if (match.type === 'destination') return getDestinationMetadata({ params });
  if (match.type === 'category') return getCategoryMetadata({ params });
  if (match.type === 'page' && match.pageKind === 'category') {
    return getCatalogueMetadata({ params: Promise.resolve({ locale, 'category-name': match.slug }) });
  }
  if (match.type === 'page') return getAttractionMetadata({ params });
  return null;
}
