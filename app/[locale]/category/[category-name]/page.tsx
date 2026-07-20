import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import type { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { getTenantFromRequest } from '@/lib/tenant';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';
import { pagePath } from '@/lib/attractionPages/pageUrl';

interface CategoryPageProps {
  params: Promise<{ locale: string; 'category-name': string }>;
}

async function getCategoryPage(categoryName: string, locale: string) {
  const tenantId = await getTenantFromRequest();
  await dbConnect(tenantId);

  const page = await AttractionPageModel.findOne({
    slug: categoryName,
    tenantId,
    isPublished: true,
  })
    .populate({
      path: 'categoryId',
      model: Category,
      match: { tenantId },
      select: 'name slug translations',
    })
    .lean();

  if (!page) return null;

  const localized = localizeEntityFields(
    JSON.parse(JSON.stringify(page)) as Record<string, unknown>,
    locale,
    ATTRACTION_PAGE_LOCALIZED_FIELDS,
  );
  const [{ tours, totalTours }, linkedPages] = await Promise.all([
    resolveAttractionPageTours(page, tenantId),
    resolveLinkedPageCards(page, tenantId, locale),
  ]);

  return {
    canonicalPath: pagePath(
      String(page.slug),
      page.pageType === 'category' ? 'category' : 'attraction',
      page.urlType,
    ),
    page: {
      ...localized,
      tours: JSON.parse(JSON.stringify(tours)),
      totalTours,
      linkedPages,
      reviews: [],
    } as unknown as CategoryPageData & { linkedPages: Awaited<ReturnType<typeof resolveLinkedPageCards>> },
  };
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, 'category-name': categoryName } = await params;
  const result = await getCategoryPage(categoryName, locale);
  if (!result) {
    return {
      title: 'Category Not Found',
      description: 'The requested category page could not be found.',
    };
  }

  const { page, canonicalPath } = result;
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.heroImage ? [page.heroImage] : [],
      type: 'website',
      url: canonicalPath,
    },
    alternates: { canonical: canonicalPath },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, 'category-name': categoryName } = await params;
  const result = await getCategoryPage(categoryName, locale);
  if (!result) notFound();

  const expectedPath = `/category/${categoryName}`;
  if (result.canonicalPath !== expectedPath) permanentRedirect(result.canonicalPath);

  return (
    <>
      <Header />
      <AttractionPageTemplate
        page={result.page}
        urlType="category"
        linkedPages={result.page.linkedPages || []}
      />
      <Footer />
    </>
  );
}
