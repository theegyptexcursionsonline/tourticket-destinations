import { ADMIN_PERMISSIONS, ROLE_PERMISSION_MAP } from '@/lib/constants/adminPermissions';

describe('admin audit permission contract', () => {
  it('is grantable through Team Access and included for full administrators', () => {
    expect(ADMIN_PERMISSIONS).toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.admin).toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.super_admin).toContain('manageAudit');
  });

  it('does not grant audit visibility to limited roles by default', () => {
    expect(ROLE_PERMISSION_MAP.operations).not.toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.content).not.toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.support).not.toContain('manageAudit');
  });
});
