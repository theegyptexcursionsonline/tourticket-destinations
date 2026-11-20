/**
 * @jest-environment node
 */
// The layout, metadata and page of one render asked for the same tenant at the
// same moment and each sent its own Tenant.findOne (reported as an N+1 on
// /[locale], /[locale]/about and /[locale]/contact). Concurrent asks now share
// one lookup; different tenants never share one.
const findOne = jest.fn();

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => findOne(...args) },
}));

function lookupResult(value: unknown, delayMs = 5) {
  const chain: Record<string, unknown> = {};
  chain.populate = () => chain;
  chain.lean = () => new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
  return chain;
}

import { clearTenantCache, getTenantConfigCached } from '@/lib/tenant';

beforeEach(() => {
  clearTenantCache();
  findOne.mockReset();
});

describe('tenant configuration lookups', () => {
  it('sends one query when the same tenant is asked for several times at once', async () => {
    findOne.mockImplementation((filter: { tenantId: string }) => lookupResult({ tenantId: filter.tenantId, name: 'A' }));
    const results = await Promise.all([
      getTenantConfigCached('tenant-a'),
      getTenantConfigCached('tenant-a'),
      getTenantConfigCached('tenant-a'),
    ]);
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(results.every((tenant) => tenant?.tenantId === 'tenant-a')).toBe(true);
    // Later asks are served from the cache.
    await getTenantConfigCached('tenant-a');
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('never shares a lookup between tenants', async () => {
    findOne.mockImplementation((filter: { tenantId: string }) => lookupResult({ tenantId: filter.tenantId }));
    const [a, b] = await Promise.all([getTenantConfigCached('tenant-a'), getTenantConfigCached('tenant-b')]);
    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne.mock.calls.map(([filter]) => filter.tenantId).sort()).toEqual(['tenant-a', 'tenant-b']);
    expect(a?.tenantId).toBe('tenant-a');
    expect(b?.tenantId).toBe('tenant-b');
  });

  it('asks again after a missing tenant, and after a failed lookup', async () => {
    findOne.mockImplementationOnce(() => lookupResult(null));
    expect(await getTenantConfigCached('tenant-a')).toBeNull();
    findOne.mockImplementationOnce(() => { throw new Error('connection lost'); });
    expect(await getTenantConfigCached('tenant-a')).toBeNull();
    findOne.mockImplementationOnce(() => lookupResult({ tenantId: 'tenant-a' }));
    expect((await getTenantConfigCached('tenant-a'))?.tenantId).toBe('tenant-a');
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it('does not cache a lookup that was in flight when the tenant was changed', async () => {
    findOne.mockImplementationOnce(() => lookupResult({ tenantId: 'tenant-a', name: 'Old' }, 20));
    const stale = getTenantConfigCached('tenant-a');
    clearTenantCache('tenant-a');
    await stale;
    findOne.mockImplementationOnce(() => lookupResult({ tenantId: 'tenant-a', name: 'New' }));
    expect((await getTenantConfigCached('tenant-a'))?.name).toBe('New');
  });
});
