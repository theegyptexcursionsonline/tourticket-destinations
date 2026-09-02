import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UnifiedPagesAdmin from '@/app/admin/pages/page';

const mockFetchJson = jest.fn();

jest.mock('@/contexts/AdminTenantContext', () => ({
  useAdminTenant: () => ({
    selectedTenantId: 'brand-a',
    getSelectedTenant: () => ({ name: 'Brand A', tenantId: 'brand-a' }),
    tenants: [{ tenantId: 'brand-a', domain: 'brand-a.example' }],
  }),
}));
jest.mock('@/lib/admin/fetchJsonWithRetry', () => ({
  fetchJsonWithRetry: (...args: unknown[]) => mockFetchJson(...args),
}));

const row = {
  id: '66a000000000000000000001',
  tenantId: 'brand-a',
  kind: 'attraction',
  title: 'Giza Plateau',
  slug: 'giza-plateau',
  urlType: 'default',
  publicPath: '/attractions/giza-plateau',
  editHref: '/admin/attraction-pages/66a000000000000000000001/edit',
  isPublished: true,
  featured: false,
  createdAt: '2026-01-05T00:00:00.000Z',
  updatedAt: '2026-03-09T00:00:00.000Z',
  updatedBy: { name: 'Sara Editor' },
};

function lastRequestedUrl(): string {
  return String(mockFetchJson.mock.calls[mockFetchJson.mock.calls.length - 1][0]);
}

describe('Pages list sorting and columns', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/admin/pages');
    mockFetchJson.mockReset();
    mockFetchJson.mockResolvedValue({
      response: { ok: true, status: 200 },
      data: { success: true, data: [row], nextCursor: null, counts: { attraction: 1, 'category-landing': 0, category: 0, total: 1 } },
    });
  });

  it('shows no URL column (parity with EEO) and a Created column by default', async () => {
    render(<UnifiedPagesAdmin />);
    await screen.findByText('Giza Plateau');
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Page', 'Type', 'Status', 'Created', 'Actions']);
    expect(screen.queryByText('/attractions/giza-plateau')).not.toBeInTheDocument();
    expect(lastRequestedUrl()).not.toContain('sort=');
  });

  it('requests sort=updated from the server and relabels the date column Modified', async () => {
    render(<UnifiedPagesAdmin />);
    await screen.findByText('Giza Plateau');
    fireEvent.change(screen.getByLabelText('Sort pages'), { target: { value: 'updated' } });

    await waitFor(() => expect(lastRequestedUrl()).toContain('sort=updated'));
    expect(lastRequestedUrl()).toContain('tenantId=brand-a');
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toContain('Modified');
    expect(window.location.search).toContain('sort=updated');
  });

  it('restores the Last Modified sort from the URL when returning to the list', async () => {
    window.history.replaceState(null, '', '/admin/pages?sort=updated');
    render(<UnifiedPagesAdmin />);
    await screen.findByText('Giza Plateau');
    expect((screen.getByLabelText('Sort pages') as HTMLSelectElement).value).toBe('updated');
    await waitFor(() => expect(lastRequestedUrl()).toContain('sort=updated'));
  });
});
