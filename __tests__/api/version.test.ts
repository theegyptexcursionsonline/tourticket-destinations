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
  return { NextResponse: MockNextResponse };
});

import { GET } from '@/app/api/version/route';

describe('/api/version', () => {
  it('reports the build commit and branch without requiring auth', async () => {
    const response = GET() as unknown as { status: number; json: () => Promise<Record<string, unknown>> };
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('commit');
    expect(body).toHaveProperty('branch');
  });
});
