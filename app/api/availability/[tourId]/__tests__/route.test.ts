/** @jest-environment node */
import { NextRequest } from 'next/server';
const findOne = jest.fn();
const save = jest.fn();
let zone = 'Africa/Cairo';
afterEach(() => { jest.useRealTimers(); zone = 'Africa/Cairo'; });
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: (...args: unknown[]) => findOne(...args) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: () => ({ select: () => ({ lean: async () => [] }) }) } }));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: async () => 'site-one', getTenantConfigCached: async () => ({ localization: { defaultTimezone: zone } }), buildStrictTenantQuery: (query: object, tenantId: string) => ({ ...query, $or: [{ tenantId }, { tenantIds: tenantId }] }) }));
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

it('returns only future authoritative times and marks a fully elapsed option unavailable', async () => {
  jest.useFakeTimers().setSystemTime(Date.parse('2026-07-15T07:00:00Z'));
  findOne.mockResolvedValue({ availability: { type: 'daily', slots: [{ time: '09:00' }, { time: '14:00' }] }, bookingOptions: [{ id: 'early', label: 'Early', timeSlots: [{ time: '09:00' }] }, { id: 'later', label: 'Later', timeSlots: [{ time: '10:00' }, { time: '14:00' }] }] });
  const result = await GET(new NextRequest('https://site.invalid/api/availability/x?date=2026-07-15'), params);
  const body = await result.json();
  expect(result.status).toBe(200);
  expect(body.data.availableTimesByOption).toEqual({ early: [], later: ['14:00'] });
  expect(body.data.stopSaleStatus).toBe('partial');
  expect(body.data.stoppedOptionIds).toEqual(['early']);
});
it('distinguishes invalid timezone configuration from a sold-out date', async () => {
  zone = 'Invalid/Zone';
  findOne.mockResolvedValue({ availability: { type: 'daily', slots: [{ time: '09:00' }] } });
  const result = await GET(new NextRequest('https://site.invalid/api/availability/x?date=2026-07-15'), params);
  expect(result.status).toBe(503);
  const body = await result.json();
  expect(body.success).toBe(false);
  expect(body.data).toBeUndefined();
});
