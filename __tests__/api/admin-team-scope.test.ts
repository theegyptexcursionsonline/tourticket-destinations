export {};

const mockRequireAdminAuth = jest.fn();
const mockUserFind = jest.fn();
const mockSort = jest.fn();
const mockLean = jest.fn();

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
  tenantForbiddenResponse: jest.fn(),
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { find: mockUserFind, findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: { sendAdminInviteEmail: jest.fn() },
}));
jest.mock('@/lib/tenant', () => ({ getTenantEmailBranding: jest.fn() }));

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
