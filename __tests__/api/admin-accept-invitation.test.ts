export {};

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockSelect = jest.fn();
const mockHash = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate },
}));
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: mockHash },
}));

const token = 'b'.repeat(64);
const request = (body: unknown) => ({ json: jest.fn().mockResolvedValue(body) });

describe('EEO Network POST /api/admin/accept-invitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({ select: mockSelect });
    mockHash.mockResolvedValue('hashed-password');
  });

  it('atomically grants pending brand access without changing an existing password', async () => {
    mockSelect.mockResolvedValue({
      _id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['manageBookings'],
      adminPortalScopes: ['main'],
      tenantIds: [],
      isActive: true,
      requirePasswordChange: false,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    });
    mockFindOneAndUpdate.mockResolvedValue({ email: 'admin@example.com' });

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const response = await POST(request({ token }) as never);

    expect(response.status).toBe(200);
    expect(mockHash).not.toHaveBeenCalled();
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(expect.objectContaining({
      _id: 'admin-1',
      invitationToken: token,
      pendingAdminRole: 'operations',
    }));
    expect(update.$set).toEqual(expect.objectContaining({
      role: 'admin',
      permissions: ['manageBookings', 'manageTours'],
      adminPortalScopes: ['main', 'multiTenant'],
      tenantIds: ['makadi-bay'],
    }));
    expect(update.$set).not.toHaveProperty('password');
    expect(update.$unset).toEqual(expect.objectContaining({
      pendingAdminRole: 1,
      pendingAdminPermissions: 1,
      pendingAdminScopes: 1,
      pendingAdminTenantIds: 1,
    }));
  });

  it('requires a password for a brand-new inactive invitee', async () => {
    mockSelect.mockResolvedValue({
      _id: 'new-1',
      email: 'new@example.com',
      role: 'customer',
      permissions: [],
      adminPortalScopes: [],
      tenantIds: [],
      isActive: false,
      requirePasswordChange: true,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    });

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const response = await POST(request({ token }) as never);

    expect(response.status).toBe(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a concurrent second acceptance', async () => {
    mockSelect.mockResolvedValue({
      _id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      permissions: [],
      adminPortalScopes: ['main'],
      tenantIds: [],
      isActive: true,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: [],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    });
    mockFindOneAndUpdate.mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const response = await POST(request({ token }) as never);

    expect(response.status).toBe(409);
  });
});
