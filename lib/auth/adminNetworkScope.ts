export const ADMIN_NETWORK_TENANT_IDS = [
  'aswan-excursions',
  'cairo-excursions-online',
  'dahab-excursions',
  'el-gouna',
  'hurghada-excursions-online',
  'hurghada-speedboat',
  'luxor-excursions',
  'makadi-bay',
  'marsa-alam-excursions',
  'sharm-excursions-online',
] as const;

const ADMIN_NETWORK_TENANT_SET = new Set<string>(ADMIN_NETWORK_TENANT_IDS);

export function isAdminNetworkTenantId(value: unknown): value is string {
  return typeof value === 'string' && ADMIN_NETWORK_TENANT_SET.has(value);
}

export function resolveAdminNetworkTenantIds(role: string, value: unknown): string[] {
  if (role === 'super_admin') {
    return [...ADMIN_NETWORK_TENANT_IDS];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(isAdminNetworkTenantId)));
}
