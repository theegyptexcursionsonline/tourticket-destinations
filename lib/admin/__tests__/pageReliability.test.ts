import { combinePageFilters } from '../pageFilters';
import { fetchJsonWithRetry } from '../fetchJsonWithRetry';

describe('Pages admin reliability', () => {
  it('keeps tenant scope when cursor and search also use OR clauses', () => {
    const result = combinePageFilters(
      { $or: [{ tenantId: 'makadi' }, { tenantIds: 'makadi' }] },
      { $or: [{ createdAt: { $lt: new Date(0) } }, { _id: { $lt: '1' } }] },
      { $or: [{ title: /safari/i }, { slug: /safari/i }] },
    );
    expect((result.$and as unknown[])).toHaveLength(3);
  });

  it('retries one transient server failure', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ status: 503, json: async () => ({ success: false }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    const result = await fetchJsonWithRetry<{ success: boolean }>('/api/admin/pages', {}, fetcher as unknown as typeof fetch);
    expect(result.data.success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
