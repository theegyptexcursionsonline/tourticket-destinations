jest.mock('@/lib/jwt', () => ({ verifyToken: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn((data, init) => ({ data, status: init?.status || 200 })) },
}));

import { canAccessTenant } from '@/lib/auth/adminAuth';

describe('admin tenant access', () => {
  const base = {
    userId: 'user-1',
    role: 'admin' as const,
    permissions: [],
    tenantIds: ['brand-a'],
  };

  it('allows only explicitly assigned tenants for non-super admins', () => {
    expect(canAccessTenant(base, 'brand-a')).toBe(true);
    expect(canAccessTenant(base, 'brand-b')).toBe(false);
  });

  it('allows super administrators to access every tenant', () => {
    expect(canAccessTenant({ ...base, role: 'super_admin' }, 'brand-b')).toBe(true);
  });
});
