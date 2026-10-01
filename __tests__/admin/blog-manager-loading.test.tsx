/**
 * The admin blog page no longer server-renders posts (it used to run
 * Blog.find({}) for every brand and stream the result to anyone). The manager
 * loads them from the brand-scoped API, so loading, failure and "no posts"
 * must be three different, honest states.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BlogManager from '@/app/admin/blog/BlogManager';

let mockSelectedTenantId = 'hurghada-excursions-online';
jest.mock('@/contexts/AdminTenantContext', () => ({
  useAdminTenant: () => ({ selectedTenantId: mockSelectedTenantId, tenants: [] }),
}));

const post = (title: string, tenantId: string) => ({
  _id: title.toLowerCase().replace(/\W+/g, '-'),
  title,
  slug: title.toLowerCase().replace(/\W+/g, '-'),
  excerpt: `${title} excerpt`,
  content: '<p>Body</p>',
  featuredImage: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  images: [],
  category: 'travel-tips',
  tags: [],
  author: 'Editor',
  status: 'published',
  featured: false,
  readTime: 3,
  views: 0,
  likes: 0,
  tenantId,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
});

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

const fetchMock = jest.fn();

beforeEach(() => {
  mockSelectedTenantId = 'hurghada-excursions-online';
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('BlogManager list states', () => {
  it('shows a loading skeleton — not an empty blog — while posts load', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<BlogManager />);

    expect(screen.getByRole('status', { name: 'Loading blog posts' })).toBeInTheDocument();
    expect(screen.getByText('Loading posts…')).toBeInTheDocument();
    expect(screen.queryByText('No blog posts yet')).toBeNull();
  });

  it("loads the selected brand's posts from the scoped API", async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { success: true, data: [post('Hurghada snorkel guide', 'hurghada-excursions-online')] }));
    render(<BlogManager />);

    expect(await screen.findByText('Hurghada snorkel guide')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/blog?tenantId=hurghada-excursions-online');
    expect(init).toEqual(expect.objectContaining({ cache: 'no-store' }));
  });

  it('asks for "All brands" without a tenant parameter, leaving the scope to the server', async () => {
    mockSelectedTenantId = 'all';
    fetchMock.mockReturnValue(jsonResponse(200, { success: true, data: [] }));
    render(<BlogManager />);

    await screen.findByText('No blog posts yet');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/blog?');
  });

  it.each([
    [401, 'Your session has ended. Sign in again to load the blog posts.'],
    [403, 'You do not have access to the blog posts of this brand.'],
    [500, 'We could not load the blog posts. Nothing was changed.'],
  ])('a %s is a failure with a retry, never "No blog posts yet"', async (status, message) => {
    fetchMock.mockReturnValueOnce(jsonResponse(status, { success: false, error: 'refused' }));
    render(<BlogManager />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Blog posts could not be loaded');
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText('No blog posts yet')).toBeNull();

    fetchMock.mockReturnValueOnce(jsonResponse(200, { success: true, data: [post('Recovered post', 'hurghada-excursions-online')] }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered post')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a network error is a failure, not an empty blog', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<BlogManager />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Blog posts could not be loaded');
    expect(screen.queryByText('No blog posts yet')).toBeNull();
  });

  it('a genuinely empty brand shows the empty state', async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { success: true, data: [] }));
    render(<BlogManager />);

    expect(await screen.findByText('No blog posts yet')).toBeInTheDocument();
  });

  it("switching brand never shows the previous brand's posts while the next brand loads", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse(200, { success: true, data: [post('Hurghada only post', 'hurghada-excursions-online')] }));
    const { rerender } = render(<BlogManager />);
    expect(await screen.findByText('Hurghada only post')).toBeInTheDocument();

    let resolveCairo: (value: unknown) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveCairo = resolve; }));
    mockSelectedTenantId = 'cairo-excursions-online';
    rerender(<BlogManager />);

    expect(screen.queryByText('Hurghada only post')).toBeNull();
    expect(screen.getByRole('status', { name: 'Loading blog posts' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/blog?tenantId=cairo-excursions-online');

    await act(async () => {
      resolveCairo(await jsonResponse(200, { success: true, data: [post('Cairo only post', 'cairo-excursions-online')] }));
    });
    await waitFor(() => expect(screen.getByText('Cairo only post')).toBeInTheDocument());
    expect(screen.queryByText('Hurghada only post')).toBeNull();
  });
});
