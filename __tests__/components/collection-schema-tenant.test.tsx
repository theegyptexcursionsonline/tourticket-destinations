import CollectionSchema from '@/components/schema/CollectionSchema';

const mockHeaders = jest.fn();
jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

// This network serves ~20 white-label brands from one build. Structured data
// built from a build-time base URL told search engines that every brand's
// listing page lived on the shared deployment host, and named one brand in
// the description shown for all of them.
async function renderSchema(props: Parameters<typeof CollectionSchema>[0]) {
  const element = await CollectionSchema(props);
  const html = element.props.dangerouslySetInnerHTML.__html as string;
  return JSON.parse(html.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'));
}

function headerMap(entries: Record<string, string>) {
  return { get: (key: string) => entries[key.toLowerCase()] ?? null };
}

describe('CollectionSchema white-label identity', () => {
  beforeEach(() => mockHeaders.mockReset());

  it('uses the requesting brand host, not the deployment host', async () => {
    mockHeaders.mockResolvedValue(headerMap({ host: 'hurghadaexcursionsonline.com', 'x-forwarded-proto': 'https' }));

    const ld = await renderSchema({ name: 'Boat Trips', url: '/categories/boat-trips', items: [{ name: 'Reef Tour', url: '/reef-tour' }] });
    const serialized = JSON.stringify(ld);

    expect(serialized).toContain('https://hurghadaexcursionsonline.com/categories/boat-trips');
    expect(serialized).not.toContain('eeo-main.netlify.app');
    expect(serialized).not.toContain('egypt-excursionsonline.com');
  });

  it('prefers the tenant domain header when the platform sets one', async () => {
    mockHeaders.mockResolvedValue(headerMap({ host: 'eeo-main.netlify.app', 'x-tenant-domain': 'cairoexcursionsonline.com' }));

    const ld = await renderSchema({ name: 'Day Trips', url: '/categories/day-trips' });
    expect(JSON.stringify(ld)).toContain('https://cairoexcursionsonline.com/categories/day-trips');
  });

  it('never names one brand in another brand default description', async () => {
    mockHeaders.mockResolvedValue(headerMap({ host: 'luxorexcursions.com' }));

    const ld = await renderSchema({ name: 'Diving', url: '/categories/diving' });
    const collection = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'CollectionPage');

    expect(collection.description).toBe('Browse Diving');
    expect(collection.description).not.toMatch(/Egypt Excursions Online/i);
  });

  it('falls back to the configured base URL when no host is available', async () => {
    mockHeaders.mockRejectedValue(new Error('headers() unavailable'));

    const ld = await renderSchema({ name: 'Diving', url: '/categories/diving' });
    const collection = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'CollectionPage');

    expect(String(collection.url)).toMatch(/^https?:\/\//);
  });
});
