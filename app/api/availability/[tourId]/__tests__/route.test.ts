/** @jest-environment node */
import { NextRequest } from 'next/server';
const findOne = jest.fn();
const save = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: (...args: unknown[]) => findOne(...args) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: () => ({ select: () => ({ lean: async () => [] }) }) } }));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: async () => 'site-one', buildStrictTenantQuery: (query: object, tenantId: string) => ({ ...query, $or: [{ tenantId }, { tenantIds: tenantId }] }) }));
import { GET } from '../route';
const params = { params: Promise.resolve({ tourId: '69861281f1598842cc1e5193' }) };
it('reads legacy options without saving or minting new identities', async () => {
  findOne.mockResolvedValue({ bookingOptions: [{ label: 'Legacy' }, { id: 'stable', label: 'Existing' }], save });
  const result = await GET(new NextRequest('https://site.invalid/api/availability/x?date=2026-09-20'), params);
  expect(result.status).toBe(200);
  expect(JSON.stringify(await result.json())).toContain('option-0');
  expect(save).not.toHaveBeenCalled();
  expect(findOne).toHaveBeenCalledWith({ _id: '69861281f1598842cc1e5193', isPublished: true, archivedAt: null, $or: [{ tenantId: 'site-one' }, { tenantIds: 'site-one' }] });
});
it('does not expose an unavailable or other-tenant tour', async () => {
  findOne.mockResolvedValue(null);
  const result = await GET(new NextRequest('https://site.invalid/api/availability/x?date=2026-09-20'), params);
  expect(result.status).toBe(404);
});
