const mockCreate = jest.fn();
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/AdminMutationAudit', () => ({
  __esModule: true,
  default: { create: (...args: unknown[]) => mockCreate(...args) },
}));

import { describeAdminMutation, escapeCsvCell, recordAdminMutation } from '@/lib/admin/adminAudit';

function makeRequest(url: string, init: { method?: string; body?: Record<string, unknown> } = {}) {
  const parsed = new URL(url);
  const serializedBody = init.body ? JSON.stringify(init.body) : '';
  const headerValues = new Map<string, string>();
  if (serializedBody) headerValues.set('content-type', 'application/json');
  return {
    method: init.method || 'GET',
    nextUrl: { pathname: parsed.pathname, searchParams: parsed.searchParams },
    headers: { get: (name: string) => headerValues.get(name.toLowerCase()) || null },
    clone: () => ({ json: async () => init.body || {} }),
  } as any;
}

describe('admin audit descriptors', () => {
  it.each([
    ['POST', '/api/admin/tours', 'create', 'tours'],
    ['PATCH', '/api/admin/bookings/64c2f4bc2f4bc2f4bc2f4bc2', 'update', 'bookings'],
    ['DELETE', '/api/admin/team/64c2f4bc2f4bc2f4bc2f4bc2', 'delete', 'team'],
    ['POST', '/api/admin/bookings/64c2f4bc2f4bc2f4bc2f4bc2/refund', 'execute', 'bookings'],
    ['POST', '/api/algolia/sync', 'execute', 'algolia'],
  ])('classifies %s %s as %s on %s', (method, path, action, resourceType) => {
    expect(describeAdminMutation(method, path)).toEqual(expect.objectContaining({
      action,
      resourceType,
    }));
  });

  it('captures an identifier without copying request data', () => {
    const descriptor = describeAdminMutation(
      'PATCH',
      '/api/admin/tours/64c2f4bc2f4bc2f4bc2f4bc2',
    );
    expect(descriptor.resourceId).toBe('64c2f4bc2f4bc2f4bc2f4bc2');
    expect(JSON.stringify(descriptor)).not.toContain('password');
  });
});

describe('audit CSV safety', () => {
  it.each(['=SUM(1,1)', '+cmd', '-10+20', '@formula'])('neutralizes formula input %s', (value) => {
    expect(escapeCsvCell(value)).toBe(`"'${value}"`);
  });

  it('quotes commas and embedded quotes', () => {
    expect(escapeCsvCell('Doe, "Jane"')).toBe('"Doe, ""Jane"""');
  });
});

describe('automatic admin mutation capture', () => {
  beforeEach(() => mockCreate.mockReset().mockResolvedValue({}));

  it('records actor and tenant metadata but never stores the request body', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours', {
      method: 'POST',
      body: { tenantId: 'brand-a', title: 'Private itinerary', password: 'never-log' },
    });
    await recordAdminMutation(request, {
      userId: 'admin-1',
      email: 'Supervisor@Example.com',
      name: 'Site Supervisor',
      role: 'operations',
      permissions: ['manageTours'],
      tenantIds: ['brand-a'],
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'admin-1',
      actorEmail: 'supervisor@example.com',
      actorName: 'Site Supervisor',
      tenantIds: ['brand-a'],
      action: 'create',
      resourceType: 'tours',
    }));
    expect(JSON.stringify(mockCreate.mock.calls[0][0])).not.toContain('Private itinerary');
    expect(JSON.stringify(mockCreate.mock.calls[0][0])).not.toContain('never-log');
  });

  it('does not record read-only requests', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours');
    await recordAdminMutation(request, {
      userId: 'admin-1', role: 'admin', permissions: ['manageAudit'],
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not duplicate routes that write a success-aware audit event themselves', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/team/64c2f4bc2f4bc2f4bc2f4bc2/permanent', {
      method: 'DELETE',
    });
    await recordAdminMutation(request, {
      userId: 'admin-1', role: 'super_admin', permissions: ['manageUsers'],
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not let a limited administrator inject activity into another tenant', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours?tenantId=brand-b', {
      method: 'PATCH',
    });
    await recordAdminMutation(request, {
      userId: 'admin-1',
      role: 'operations',
      permissions: ['manageTours'],
      tenantIds: ['brand-a'],
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
