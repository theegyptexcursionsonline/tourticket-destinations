import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionLandingPage from '@/components/AttractionLandingPage';
import type { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';
import { pagePath } from '@/lib/attractionPages/pageUrl';

interface AttractionPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

async function getAttractionPage(slug: string, locale: string) {
  const tenantId = await getTenantFromRequest();
  await dbConnect(tenantId);

  const page = await AttractionPageModel.findOne({
    slug,
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

  const canonicalPath = pagePath(
    String(page.slug),
    page.pageType === 'category' ? 'category' : 'attraction',
    page.urlType,
  );
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
    tenantId,
    canonicalPath,
    page: {
      ...localized,
      tours: JSON.parse(JSON.stringify(tours)),
      totalTours,
      linkedPages,
      reviews: [],
    } as unknown as CategoryPageData & { linkedPages: Awaited<ReturnType<typeof resolveLinkedPageCards>> },
  };
}

export async function generateMetadata({ params }: AttractionPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const [result, tenantId] = await Promise.all([
    getAttractionPage(slug, locale),
    getTenantFromRequest(),
  ]);
  const tenant = await getTenantPublicConfig(tenantId);

  if (!result) {
    return {
      title: 'Attraction Not Found',
      description: 'The requested attraction could not be found.',
    };
  }

  const { page, canonicalPath } = result;
  const siteName = tenant?.name || 'Tours';
  return {
    title: page.metaTitle || `${page.title} | ${siteName}`,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.heroImage ? [page.heroImage] : (tenant?.seo.ogImage ? [tenant.seo.ogImage] : []),
      type: 'website',
      siteName,
      url: canonicalPath,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.heroImage ? [page.heroImage] : [],
    },
    alternates: { canonical: canonicalPath },
    robots: { index: page.isPublished, follow: page.isPublished },
  };
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function AttractionPage({ params }: AttractionPageProps) {
  const { slug, locale } = await params;
  const result = await getAttractionPage(slug, locale);
  if (!result) notFound();

  const expectedPath = `/attraction/${slug}`;
  if (result.canonicalPath !== expectedPath) permanentRedirect(result.canonicalPath);

  return (
    <>
      <Header startSolid />
      <AttractionLandingPage
        attraction={result.page as any}
        linkedPages={result.page.linkedPages || []}
      />
      <Footer />
    </>
  );
}
