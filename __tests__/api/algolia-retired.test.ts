/**
 * Owner decision 2026-08-21: Algolia is retired in favour of the AI Search
 * agent + /api/search/tours. These pins keep the old endpoints from quietly
 * coming back — the shared index behind them leaked catalogue across sites.
 */
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

    async json() {
      return this.data;
    }
  }

  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

import { GET as searchGet, POST as searchPost } from '@/app/api/search/algolia/route';
import { GET as syncGet, POST as syncPost } from '@/app/api/algolia/sync/route';

type Handler = () => Promise<{ status: number; json(): Promise<{ retired?: boolean }> }>;

describe('algolia endpoints are retired (owner decision 2026-08-21)', () => {
  it.each([
    ['search GET', searchGet],
    ['search POST', searchPost],
    ['sync GET', syncGet],
    ['sync POST', syncPost],
  ])('%s answers 410 Gone', async (_label, handler) => {
    const res = await (handler as Handler)();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.retired).toBe(true);
  });
});
