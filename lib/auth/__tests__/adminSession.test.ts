jest.mock('@/lib/jwt', () => ({
  signToken: jest.fn().mockResolvedValue('signed-token'),
}));

import { signToken } from '@/lib/jwt';
import {
  ADMIN_ENROLLMENT_SCOPE,
  ADMIN_SESSION_SCOPE,
  signAdminSessionToken,
} from '@/lib/auth/adminSession';

const identity = {
  userId: '507f1f77bcf86cd799439011',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  permissions: ['manageDashboard'],
  tenantIds: ['brand-a'],
};

describe('admin session scopes', () => {
  beforeEach(() => jest.clearAllMocks());
  it('issues a short, permissionless enrollment session', async () => {
    await signAdminSessionToken(identity, true);
    expect(signToken).toHaveBeenCalledWith(
      expect.objectContaining({ scope: ADMIN_ENROLLMENT_SCOPE, permissions: [], tenantIds: [] }),
      { expiresIn: '15m' },
    );
  });
  it('issues the full session only with current permissions', async () => {
    await signAdminSessionToken(identity);
    expect(signToken).toHaveBeenCalledWith(
      expect.objectContaining({ scope: ADMIN_SESSION_SCOPE, permissions: ['manageDashboard'], tenantIds: ['brand-a'] }),
      { expiresIn: '8h' },
    );
  });
});
