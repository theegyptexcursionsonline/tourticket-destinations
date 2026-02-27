/**
 * API Route Handler Tests
 *
 * Tests Next.js API route handlers directly by importing them.
 * These run during build without needing a live server or database.
 */

// Mock NextResponse.json since the real one needs Web APIs not available in Node/Jest
jest.mock('next/server', () => {
  class MockNextResponse {
    body: any;
    status: number;
    headers: Map<string, string>;
    cookies: { set: jest.Mock; get: jest.Mock; delete: jest.Mock };
    _data: any;

    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map();
      this.cookies = { set: jest.fn(), get: jest.fn(), delete: jest.fn() };
    }

    async json() {
      return this._data;
    }

    static json(data: any, init?: any) {
      const resp = new MockNextResponse(null, init);
      resp._data = data;
      return resp;
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn(),
  };
});

// Mock database connection
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

// Chainable mock helper
function chainable(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['find', 'findOne', 'findById', 'populate', 'lean', 'sort', 'skip', 'limit', 'select', 'exec'];
  methods.forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.lean.mockResolvedValue(resolveValue);
  chain.exec.mockResolvedValue(resolveValue);
  chain.countDocuments = jest.fn().mockResolvedValue(0);
  return chain;
}

// Mock Mongoose models with proper chaining
const tourChain = chainable([]);
jest.mock('@/lib/models/Tour', () => {
  const mock: any = jest.fn().mockReturnValue(tourChain);
  Object.assign(mock, tourChain);
  mock.find = jest.fn().mockReturnValue(tourChain);
  mock.findOne = jest.fn().mockReturnValue(tourChain);
  mock.findById = jest.fn().mockReturnValue(tourChain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

const destChain = chainable([]);
jest.mock('@/lib/models/Destination', () => {
  const mock: any = jest.fn().mockReturnValue(destChain);
  Object.assign(mock, destChain);
  mock.find = jest.fn().mockReturnValue(destChain);
  mock.findOne = jest.fn().mockReturnValue(destChain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/Category', () => {
  const chain = chainable([]);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.find = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/user', () => {
  const chain = chainable(null);
  // Make chain thenable so `await chain` resolves to null (user not found)
  chain.then = (resolve: any) => Promise.resolve(null).then(resolve);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.findOne = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/Booking', () => {
  const chain = chainable([]);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.find = jest.fn().mockReturnValue(chain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/Tenant', () => {
  const chain = chainable(null);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.findOne = jest.fn().mockReturnValue(chain);
  mock.find = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/jwt', () => ({
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifyToken: jest.fn().mockReturnValue(null),
}));

// Helper to create a NextRequest-like object
function createRequest(method: string, url: string, body?: any) {
  return {
    method,
    url: `http://localhost:3000${url}`,
    nextUrl: new URL(`http://localhost:3000${url}`),
    json: async () => body || {},
    headers: new Headers({}),
    cookies: { get: jest.fn().mockReturnValue(undefined) },
  } as any;
}

describe('API Route Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/login', () => {
    let POST: any;

    beforeAll(async () => {
      const mod = await import('@/app/api/admin/login/route');
      POST = mod.POST;
    });

    it('rejects empty body with 400', async () => {
      const request = createRequest('POST', '/api/admin/login', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('rejects missing password with 400', async () => {
      const request = createRequest('POST', '/api/admin/login', { email: 'admin@test.com' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('rejects invalid credentials with 401', async () => {
      const request = createRequest('POST', '/api/admin/login', {
        email: 'wrong@test.com',
        password: 'wrongpassword',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/destinations', () => {
    let GET: any;

    beforeAll(async () => {
      const mod = await import('@/app/api/destinations/route');
      GET = mod.GET;
    });

    it('returns 200 with destinations array', async () => {
      const request = createRequest('GET', '/api/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
