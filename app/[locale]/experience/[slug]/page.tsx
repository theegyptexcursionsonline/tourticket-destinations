import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';
import { getContentMatchMetadata, renderContentMatch } from '@/lib/content/renderContentMatch';

interface PageProps { params: Promise<{ locale: string; slug: string }>; }
const SEGMENT = 'experience';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);
  return decision.action === 'render'
    ? (await getContentMatchMetadata(decision.match, locale)) || { title: 'Not Found' }
    : { title: 'Not Found' };
}

export async function generateStaticParams() { return []; }

export default async function PrefixDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);
  if (decision.action === 'redirect') permanentRedirect(decision.to);
  if (decision.action === 'notFound') notFound();
  const element = await renderContentMatch(decision.match, locale);
  if (!element) notFound();
  return element;
}

export const revalidate = 900;
export const dynamicParams = true;
