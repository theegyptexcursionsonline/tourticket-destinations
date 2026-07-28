export {};

const mockRequireAdminAuth = jest.fn();
const mockUserFind = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindOneAndUpdate = jest.fn();
const mockUserUpdateOne = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();
const mockSort = jest.fn();
const mockLean = jest.fn();
const mockSendAdminInviteEmail = jest.fn();

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
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  tenantForbiddenResponse: jest.fn(() => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json(
      { success: false, error: 'Tenant access denied.' },
      { status: 403 },
    );
  }),
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    find: mockUserFind,
    findOne: (...args: unknown[]) => {
      const result = mockUserFindOne(...args);
      return Object.assign(result, { select: () => result });
    },
    findOneAndUpdate: mockUserFindOneAndUpdate,
    updateOne: mockUserUpdateOne,
    create: mockUserCreate,
    findByIdAndDelete: mockUserFindByIdAndDelete,
  },
}));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: { sendAdminInviteEmail: mockSendAdminInviteEmail },
}));
jest.mock('@/lib/tenant', () => ({ getTenantEmailBranding: jest.fn() }));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('EEO Network GET /api/admin/team tenant scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      role: 'admin',
      tenantIds: ['makadi-bay', 'hurghada-speedboat'],
      permissions: ['manageUsers'],
    });
    const chain = { sort: mockSort, lean: mockLean };
    mockUserFind.mockReturnValue(chain);
    mockSort.mockReturnValue(chain);
    mockLean.mockResolvedValue([{
      _id: 'member-1',
      email: 'member@example.com',
      role: 'operations',
      tenantIds: ['makadi-bay'],
    }]);
    mockUserFindOne.mockResolvedValue(null);
    mockSendAdminInviteEmail.mockResolvedValue(undefined);
  });

  it('loads All Brands for an admin but only from their authorized network scope', async () => {
    const { GET } = await import('@/app/api/admin/team/route');
    const response = await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/team',
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockUserFind).toHaveBeenCalledWith({
      $and: [
        {
          $or: [
            { role: { $ne: 'customer' } },
            { pendingAdminRole: { $exists: true } },
            { formerAdminScopes: 'multiTenant' },
          ],
        },
        {
          $or: [
            { tenantIds: { $in: ['makadi-bay', 'hurghada-speedboat'] } },
          { pendingAdminTenantIds: { $in: ['makadi-bay', 'hurghada-speedboat'] } },
          { formerAdminTenantIds: { $in: ['makadi-bay', 'hurghada-speedboat'] } },
          ],
        },
      ],
    });
    expect(body.data).toHaveLength(1);
  });

  it('narrows a selected-brand view to that brand', async () => {
    const { GET } = await import('@/app/api/admin/team/route');
    await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/team?tenantId=makadi-bay',
    } as never);

    expect(mockUserFind).toHaveBeenCalledWith({
      $and: [
        {
          $or: [
            { role: { $ne: 'customer' } },
            { pendingAdminRole: { $exists: true } },
            { formerAdminScopes: 'multiTenant' },
          ],
        },
        {
          $or: [
            { tenantIds: 'makadi-bay' },
          { pendingAdminTenantIds: 'makadi-bay' },
          { formerAdminTenantIds: 'makadi-bay' },
          ],
        },
      ],
    });
  });
});

describe('EEO Network POST /api/admin/team pending invitations', () => {
  const request = (body: unknown) => ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers({ host: 'dashboard.egypt-excursionsonline.com' }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      role: 'admin',
      email: 'network-admin@example.com',
      tenantIds: ['makadi-bay', 'hurghada-speedboat'],
      permissions: ['manageUsers'],
    });
    mockSendAdminInviteEmail.mockResolvedValue(undefined);
  });

  it('invites an existing main-portal admin without granting network access yet', async () => {
    mockUserFindOne.mockResolvedValue({
      _id: 'existing-1',
      role: 'admin',
      isActive: true,
      permissions: ['manageBookings'],
      tenantIds: [],
      adminPortalScopes: ['main'],
    });
    mockUserFindOneAndUpdate.mockResolvedValue({
      _id: 'existing-1',
      firstName: 'Ahmed',
      lastName: 'Khalil',
      email: 'ahmed@example.com',
      role: 'admin',
      isActive: true,
      permissions: ['manageBookings'],
      tenantIds: [],
      adminPortalScopes: ['main'],
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Ahmed',
      lastName: 'Khalil',
      email: 'ahmed@example.com',
      permissions: ['manageTours'],
      tenantIds: ['makadi-bay'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.existingAccountInvitation).toBe(true);
    const [, update] = mockUserFindOneAndUpdate.mock.calls[0];
    expect(update.$set).toEqual(expect.objectContaining({
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    }));
    expect(update.$set).not.toHaveProperty('role');
    expect(update.$set).not.toHaveProperty('permissions');
    expect(update.$set).not.toHaveProperty('tenantIds');
    expect(update.$set).not.toHaveProperty('adminPortalScopes');
    expect(update).not.toHaveProperty('$addToSet');
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockSendAdminInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ inviteeEmail: 'ahmed@example.com' }),
    );
  });

  it('invites an existing customer without granting any admin access yet', async () => {
    const existingCustomer = {
      _id: 'customer-1',
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
      role: 'customer',
      isActive: true,
      permissions: [],
      tenantIds: [],
    };
    mockUserFindOne.mockResolvedValue(existingCustomer);
    mockUserFindOneAndUpdate.mockResolvedValue({
      ...existingCustomer,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
      permissions: ['manageTours'],
      tenantIds: ['makadi-bay'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.convertedExistingCustomer).toBe(true);

    const [, update] = mockUserFindOneAndUpdate.mock.calls[0];
    // The whole point: the invitation records an offer and touches nothing
    // that could let the account act as an admin before accepting it.
    expect(update.$set).toEqual(expect.objectContaining({
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    }));
    expect(update.$set).not.toHaveProperty('role');
    expect(update.$set).not.toHaveProperty('permissions');
    expect(update.$set).not.toHaveProperty('isActive');
    expect(update.$set).not.toHaveProperty('tenantIds');
    expect(update).not.toHaveProperty('$addToSet');

    expect(mockSendAdminInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ inviteeEmail: 'existing.customer@example.com' }),
    );
  });

  it('scopes brand assignment before looking up or changing an existing account', async () => {
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Ahmed',
      lastName: 'Khalil',
      email: 'ahmed@example.com',
      tenantIds: ['unauthorized-brand'],
    }) as never);

    expect(response.status).toBe(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
    expect(mockUserFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps newly invited accounts access-free until they accept', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      _id: 'new-1',
      firstName: 'Existing',
      lastName: 'Ahmed',
      email: 'existing.customer@example.com',
      role: 'customer',
      permissions: [],
      isActive: false,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageBookings'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Ahmed',
      email: 'existing.customer@example.com',
      permissions: ['manageBookings'],
      tenantIds: ['makadi-bay'],
    }) as never);

    expect(response.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'existing.customer@example.com',
      role: 'customer',
      permissions: [],
      isActive: false,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageBookings'],
      pendingAdminScopes: ['multiTenant'],
      pendingAdminTenantIds: ['makadi-bay'],
    }));
    const [created] = mockUserCreate.mock.calls[0];
    expect(created).not.toHaveProperty('tenantIds');
    expect(created).not.toHaveProperty('adminPortalScopes');
  });
});
