/**
 * @jest-environment node
 */
// A malformed author slug or pagination cursor in the URL must answer 404,
// never a 500 page error (live Sentry: "author must be a lowercase slug").
import { PublicBlogListValidationError } from '@/lib/content/publicBlogListing';

const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const getTenantAuthorBlogPage = jest.fn();

jest.mock('next/navigation', () => ({ notFound: () => notFound() }));
jest.mock('next/image', () => () => null);
jest.mock('@/i18n/navigation', () => ({ Link: () => null }));
jest.mock('@/components/Header', () => () => null);
jest.mock('@/components/Footer', () => () => null);
jest.mock('@/components/schema/CollectionSchema', () => () => null);
jest.mock('@/lib/seo', () => ({ getSeoAlternates: () => ({}) }));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: async () => 'hurghada-excursions-online',
  getTenantPublicConfig: async () => ({ name: 'Site' }),
}));
jest.mock('@/lib/content/blogReader', () => ({
  getTenantAuthorBlogPage: (...args: unknown[]) => getTenantAuthorBlogPage(...args),
}));
jest.mock('next-intl/server', () => ({ getLocale: async () => 'en' }));

import AuthorPage, { generateMetadata } from '@/app/[locale]/author/[slug]/page';

const props = (slug: string, cursor?: string) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve({ cursor }),
});

beforeEach(() => {
  notFound.mockClear();
  getTenantAuthorBlogPage.mockReset();
});

describe('author page with an invalid URL', () => {
  it('answers 404 for a malformed author slug', async () => {
    getTenantAuthorBlogPage.mockRejectedValue(new PublicBlogListValidationError('author must be a lowercase slug'));
    await expect(AuthorPage(props('–x'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('answers 404 for a malformed pagination cursor', async () => {
    getTenantAuthorBlogPage.mockRejectedValue(new PublicBlogListValidationError('Invalid blog pagination cursor'));
    await expect(AuthorPage(props('ahmed', 'zzz'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('still builds metadata for a malformed slug instead of throwing', async () => {
    getTenantAuthorBlogPage.mockRejectedValue(new PublicBlogListValidationError('author must be a lowercase slug'));
    const meta = await generateMetadata({ params: Promise.resolve({ slug: '–x' }) });
    expect(meta.title).toContain('Site');
  });

  it('does not hide a real failure such as a database outage', async () => {
    getTenantAuthorBlogPage.mockRejectedValue(new Error('db down'));
    await expect(AuthorPage(props('ahmed'))).rejects.toThrow('db down');
    expect(notFound).not.toHaveBeenCalled();
  });
});
