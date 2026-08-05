import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
          outcome: 'failed',
          statusCode: 503,
          resourceType: 'pages',
          resourceId: 'tour-1',
          resourceLabel: 'Desert Safari',
          summary: 'Updated attraction page “Desert Safari”: published state',
          changedFields: ['status'],
          changes: [{ field: 'status', before: 'draft', after: 'published' }],
          failureCode: 'PROVIDER_UNAVAILABLE',
          method: 'PATCH',
          path: '/api/admin/tours/tour-1',
          tenantIds: ['brand-a'],
          requestId: 'request-1',
          clientIp: '203.0.113.4',
          userAgent: 'Mobile Safari',
          createdAt: '2026-08-04T10:00:00.000Z',
        }],
        pagination: { hasMore: false, nextCursor: null },
        stats: { total: 12, today: 3, administrators: 2, succeeded: 8, rejected: 2, failed: 1 },
        filters: { actions: ['update'], resourceTypes: ['tours'], outcomes: ['succeeded', 'rejected', 'failed'] },
      }),
    });
  });

  it('shows accountable activity, aggregate stats, filters, and report export', async () => {
    render(<AuditPage />);

    expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Administrator')).toBeInTheDocument();
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Site Supervisor')).toHaveLength(2));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('tenantId=brand-a'),
      { cache: 'no-store' },
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(2);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Desert Safari').length).toBeGreaterThan(0);
    expect(screen.getByText('Page / target')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Action did not complete successfully')).toBeInTheDocument();
    expect(screen.getAllByText(/HTTP 503/)).toHaveLength(2);
    expect(screen.getByText(/PROVIDER_UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.getAllByText('status').length).toBeGreaterThan(0);
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('Mobile Safari')).toBeInTheDocument();
    expect(screen.getByText('Affected page or target')).toBeInTheDocument();
  });
});
