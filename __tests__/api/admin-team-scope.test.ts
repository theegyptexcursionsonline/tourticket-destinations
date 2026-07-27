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
    findOne: mockUserFindOne,
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
      role: { $ne: 'customer' },
      tenantIds: { $in: ['makadi-bay', 'hurghada-speedboat'] },
    });
    expect(body.data).toHaveLength(1);
  });

  it('narrows a selected-brand view to that brand', async () => {
    const { GET } = await import('@/app/api/admin/team/route');
    await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/team?tenantId=makadi-bay',
    } as never);

    expect(mockUserFind).toHaveBeenCalledWith({
      role: { $ne: 'customer' },
      tenantIds: 'makadi-bay',
    });
  });
});

describe('EEO Network POST /api/admin/team existing-account linking', () => {
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

  it('links an existing main-portal admin without creating a duplicate account', async () => {
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
      tenantIds: ['makadi-bay'],
      adminPortalScopes: ['main', 'multiTenant'],
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
    expect(body.linkedExistingAccount).toBe(true);
    expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'existing-1', isActive: true, role: { $ne: 'customer' } },
      {
        $addToSet: {
          tenantIds: { $each: ['makadi-bay'] },
          adminPortalScopes: { $each: ['main', 'multiTenant'] },
        },
      },
      { new: true, runValidators: true },
    );
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockSendAdminInviteEmail).not.toHaveBeenCalled();
  });

  it('promotes an existing customer identity and sends a password-setup invitation', async () => {
    mockUserFindOne.mockResolvedValue({
      _id: 'customer-1',
      firstName: 'Sara',
      lastName: 'Sameh',
      email: 'sara@example.com',
      role: 'customer',
      isActive: true,
      permissions: [],
      tenantIds: [],
      requirePasswordChange: false,
    });
    mockUserFindOneAndUpdate.mockResolvedValue({
      _id: 'customer-1',
      firstName: 'Sara',
      lastName: 'Sameh',
      email: 'sara@example.com',
      role: 'operations',
      isActive: true,
      permissions: ['manageTours'],
      tenantIds: ['makadi-bay'],
      adminPortalScopes: ['multiTenant'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Sara',
      lastName: 'Sameh',
      email: 'sara@example.com',
      permissions: ['manageTours'],
      tenantIds: ['makadi-bay'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.convertedExistingCustomer).toBe(true);
    expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'customer-1', role: 'customer', isActive: true },
      {
        $set: expect.objectContaining({
          role: 'operations',
          permissions: ['manageTours'],
          requirePasswordChange: true,
        }),
        $addToSet: {
          tenantIds: { $each: ['makadi-bay'] },
          adminPortalScopes: 'multiTenant',
        },
      },
      { new: true, runValidators: true },
    );
    expect(mockSendAdminInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteeName: 'Sara Sameh',
        inviteeEmail: 'sara@example.com',
      }),
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

  it('marks newly invited accounts as network-only until explicitly linked elsewhere', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      _id: 'new-1',
      firstName: 'Sara',
      lastName: 'Ahmed',
      email: 'sara@example.com',
      role: 'operations',
      permissions: ['manageBookings'],
      isActive: false,
      tenantIds: ['makadi-bay'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Sara',
      lastName: 'Ahmed',
      email: 'sara@example.com',
      permissions: ['manageBookings'],
      tenantIds: ['makadi-bay'],
    }) as never);

    expect(response.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'sara@example.com',
      tenantIds: ['makadi-bay'],
      adminPortalScopes: ['multiTenant'],
    }));
  });
});
