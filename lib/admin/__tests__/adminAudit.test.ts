const mockCreate = jest.fn();
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/AdminMutationAudit', () => ({
  __esModule: true,
  default: { create: (...args: unknown[]) => mockCreate(...args) },
}));

import {
  describeAdminMutation,
  escapeCsvCell,
  recordAdminMutation,
  registerAdminAuditActor,
  withAdminAudit,
} from '@/lib/admin/adminAudit';

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

  it('records actor, outcome-ready target metadata, and safe fields without retaining secrets', async () => {
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
      resourceLabel: 'Private itinerary',
      changedFields: expect.arrayContaining(['tenantId', 'title']),
    }));
    expect(JSON.stringify(mockCreate.mock.calls[0][0])).not.toContain('never-log');
    expect(mockCreate.mock.calls[0][0].changedFields).not.toContain('password');
  });

  it('never retains a two-factor code as a changed field or safe value', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/2fa', {
      method: 'POST',
      body: { action: 'enable', code: '123456' },
    });
    const wrapped = withAdminAudit(async () => {
      registerAdminAuditActor({
        userId: 'admin-1', role: 'operations', permissions: [], tenantIds: ['brand-a'],
      });
      return { status: 200, headers: { get: () => null } } as never;
    });

    await wrapped(request);
    const stored = mockCreate.mock.calls[0][0];
    expect(stored.changedFields).toEqual(['action']);
    expect(JSON.stringify(stored)).not.toContain('123456');
  });

  it.each([
    [201, 'succeeded'],
    [409, 'rejected'],
    [503, 'failed'],
  ])('records the handler result after it finishes: HTTP %s is %s', async (status, outcome) => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours', {
      method: 'POST',
      body: { tenantId: 'brand-a', title: 'Safe target' },
    });
    const wrapped = withAdminAudit(async () => {
      registerAdminAuditActor({
        userId: 'admin-1',
        role: 'operations',
        permissions: ['manageTours'],
        tenantIds: ['brand-a'],
      });
      return {
        status,
        headers: { get: () => 'application/json' },
        clone: () => ({ json: async () => ({ code: status >= 400 ? 'TEST_REJECTION' : undefined }) }),
      } as never;
    });

    await wrapped(request);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      outcome,
      statusCode: status,
    }));
  });

  it('records an unhandled route exception as failed and rethrows it', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours/64c2f4bc2f4bc2f4bc2f4bc2', {
      method: 'PATCH',
    });
    const wrapped = withAdminAudit(async () => {
      registerAdminAuditActor({
        userId: 'admin-1', role: 'admin', permissions: ['manageTours'], tenantIds: ['brand-a'],
      });
      throw new Error('route exploded');
    });

    await expect(wrapped(request)).rejects.toThrow('route exploded');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'failed',
      statusCode: 500,
      failureCode: 'UNHANDLED_EXCEPTION',
    }));
  });

  it('does not record read-only requests', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/tours');
    await recordAdminMutation(request, {
      userId: 'admin-1', role: 'admin', permissions: ['manageAudit'],
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('records formerly self-audited destructive routes through the shared sink', async () => {
    const request = makeRequest('https://dashboard.example.com/api/admin/team/64c2f4bc2f4bc2f4bc2f4bc2/permanent', {
      method: 'DELETE',
    });
    await recordAdminMutation(request, {
      userId: 'admin-1', role: 'super_admin', permissions: ['manageUsers'],
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      resourceType: 'team',
      resourceId: '64c2f4bc2f4bc2f4bc2f4bc2',
      outcome: 'succeeded',
    }));
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

describe('recordAdminLogin', () => {
  beforeEach(() => mockCreate.mockClear());

  it('records a session login as an audit row', async () => {
    const { recordAdminLogin } = await import('@/lib/admin/adminAudit');
    await recordAdminLogin(
      { userId: 'u1', email: 'Sara@EEO.com', name: 'Sara M', role: 'operations' },
      '/api/admin/2fa',
      ['brand-a'],
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'u1',
      actorEmail: 'sara@eeo.com',
      action: 'login',
      outcome: 'succeeded',
      statusCode: 200,
      resourceType: 'session',
      path: '/api/admin/2fa',
      tenantIds: ['brand-a'],
    }));
  });

  it('never throws when the audit sink is down', async () => {
    mockCreate.mockRejectedValueOnce(new Error('mongo down'));
    const { recordAdminLogin } = await import('@/lib/admin/adminAudit');
    await expect(
      recordAdminLogin({ userId: 'u1', role: 'admin' }, '/api/admin/login'),
    ).resolves.toBeUndefined();
  });
});
