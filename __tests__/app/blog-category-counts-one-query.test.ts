/**
 * @jest-environment node
 */
// The blog index counted posts with one countDocuments per category: 14
// database round trips per render (Sentry N+1, thousands of events a day).
// It must ask once, grouped by category, scoped to the tenant.
const aggregate = jest.fn();
const countDocuments = jest.fn();
const listPublicBlogPosts = jest.fn(async () => ({ posts: [], pagination: { nextCursor: null, total: 5 } }));
let clientProps: Record<string, unknown> | null = null;

jest.mock('@/lib/dbConnect', () => jest.fn(async () => undefined));
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: { aggregate: (...a: unknown[]) => aggregate(...a), countDocuments: (...a: unknown[]) => countDocuments(...a) },
}));
jest.mock('@/lib/content/publicBlogListing', () => ({
  listPublicBlogPosts: (...a: unknown[]) => listPublicBlogPosts(...(a as [])),
}));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: async () => 'hurghada-excursions-online',
  getTenantPublicConfig: async () => ({ name: 'Site' }),
  buildStrictTenantQuery: (base: Record<string, unknown>, tenantId: string) => ({ ...base, $or: [{ tenantId }, { tenantIds: tenantId }] }),
}));
jest.mock('next-intl/server', () => ({ getLocale: async () => 'en' }));
jest.mock('@/components/Header', () => () => null);
jest.mock('@/components/Footer', () => () => null);
jest.mock('@/components/schema/CollectionSchema', () => () => null);
jest.mock('@/app/[locale]/blog/BlogClientPage', () => (props: Record<string, unknown>) => {
  clientProps = props;
  return null;
});

import BlogIndexPage from '@/app/[locale]/blog/page';

function findClientProps(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const el = node as { props?: Record<string, unknown> };
  if (el.props && 'categories' in el.props) return el.props;
  const kids = el.props?.children;
  for (const child of Array.isArray(kids) ? kids : [kids]) {
    const hit = findClientProps(child);
    if (hit) return hit;
  }
  return null;
}

beforeEach(() => {
  aggregate.mockReset();
  countDocuments.mockReset();
  clientProps = null;
});

describe('blog index category counts', () => {
  it('asks the database once, grouped by category and scoped to the tenant', async () => {
    aggregate.mockResolvedValue([{ _id: 'travel-tips', count: 3 }, { _id: 'food-culture', count: 2 }, { _id: 'not-a-category', count: 9 }]);
    const tree = await BlogIndexPage();
    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(countDocuments).not.toHaveBeenCalled();
    const [pipeline] = aggregate.mock.calls[0] as [Array<Record<string, any>>];
    expect(pipeline[0].$match.status).toBe('published');
    expect(pipeline[0].$match.$or).toEqual([{ tenantId: 'hurghada-excursions-online' }, { tenantIds: 'hurghada-excursions-online' }]);
    expect(pipeline[0].$match.category.$in.length).toBeGreaterThan(5);
    expect(pipeline[1]).toEqual({ $group: { _id: '$category', count: { $sum: 1 } } });

    const props = findClientProps(tree) ?? clientProps;
    const categories = props?.categories as Array<{ value: string; count: number }>;
    expect(categories.map((c) => [c.value, c.count])).toEqual([['travel-tips', 3], ['food-culture', 2]]);
  });

  it('lists no categories when the tenant has no published posts', async () => {
    aggregate.mockResolvedValue([]);
    const tree = await BlogIndexPage();
    const props = findClientProps(tree) ?? clientProps;
    expect(props?.categories).toEqual([]);
  });
});
