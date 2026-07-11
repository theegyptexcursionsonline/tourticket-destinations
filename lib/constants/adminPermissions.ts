export const ADMIN_ROLES = [
  'customer',
  'admin',
  'super_admin',
  'operations',
  'content',
  'support',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  'manageDashboard',
  'manageBookings',
  'manageTours',
  'managePricing',
  'manageContent',
  'manageDiscounts',
  'manageUsers',
  'manageReports',
  'manageTenants',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ROLE_PERMISSION_MAP: Record<AdminRole, AdminPermission[]> = {
  customer: [],
  admin: ADMIN_PERMISSIONS.filter((permission) => permission !== 'manageTenants'),
  super_admin: [...ADMIN_PERMISSIONS],
  operations: ['manageDashboard', 'manageBookings', 'manageReports'],
  content: ['manageDashboard', 'manageTours', 'managePricing', 'manageContent'],
  support: ['manageDashboard', 'manageBookings'],
};

export const DEFAULT_ADMIN_ROLE: AdminRole = 'customer';

export const DEFAULT_ADMIN_PERMISSION = 'manageDashboard';

export function getDefaultPermissions(role: AdminRole | undefined | null): AdminPermission[] {
  if (!role) {
    return [];
  }

  return ROLE_PERMISSION_MAP[role] || [];
}
