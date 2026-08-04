import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/admin/withAuth', () => ({
  __esModule: true,
  default: (Component: React.ComponentType) => Component,
}));
jest.mock('@/contexts/AdminTenantContext', () => ({
  useAdminTenant: () => ({ selectedTenantId: 'brand-a' }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import AuditPage from '../page';

describe('Audit admin page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          id: 'audit-1',
          actor: { id: 'admin-1', name: 'Site Supervisor', email: 'supervisor@example.com', role: 'operations' },
          action: 'update',
          resourceType: 'tours',
          resourceId: 'tour-1',
          summary: 'Updated Tours',
          method: 'PATCH',
          tenantIds: ['brand-a'],
          createdAt: '2026-08-04T10:00:00.000Z',
        }],
        pagination: { hasMore: false, nextCursor: null },
        stats: { total: 12, today: 3, administrators: 2 },
        filters: { actions: ['update'], resourceTypes: ['tours'] },
      }),
    });
  });

  it('shows accountable activity, aggregate stats, filters, and report export', async () => {
    render(<AuditPage />);

    expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Administrator')).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Site Supervisor')).toHaveLength(2));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Tours').length).toBeGreaterThan(0);
  });
});
