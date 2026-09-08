/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
const save = jest.fn();
let allowed = true;
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: async () => ({ role: 'admin', tenantIds: ['site-one'] }), canAccessTenant: () => allowed, tenantForbiddenResponse: () => NextResponse.json({}, { status: 403 }) }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findById: () => ({ select: async () => ({ tenantId: 'site-one', bookingOptions: [{ label: 'Legacy' }], save }) }) } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { find: () => ({ populate: () => ({ sort: () => ({ lean: async () => [] }) }) }) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: () => ({ select: () => ({ lean: async () => [{ optionIds: ['option-0'], startDate: '2026-09-10', endDate: '2026-09-10' }] }) }) } }));
import { GET } from '../route';
it('keeps legacy stop-sale aliases and performs no tour save while reading admin calendar', async () => {
  const response = await GET(new NextRequest('https://site.invalid/api/admin/availability?tourId=69861281f1598842cc1e5193&month=9&year=2026'));
  expect(response.status).toBe(200);
  expect(save).not.toHaveBeenCalled();
  expect(JSON.stringify(await response.json())).toContain('full');
});
it('refuses a tenant outside the staff scope', async () => {
  allowed = false;
  const response = await GET(new NextRequest('https://site.invalid/api/admin/availability?tenantId=other'));
  expect(response.status).toBe(403);
});
