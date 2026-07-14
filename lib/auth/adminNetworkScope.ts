export const ADMIN_NETWORK_TENANT_IDS = [
  'aegypten-ausfluege',
  'aswan-excursions',
  'cairo-ausfluege',
  'cairo-excursions-online',
  'dahab-excursions',
  'el-gouna',
  'elgouna-ausfluege',
  'hurghada-ausfluege',
  'hurghada-excursions-online',
  'hurghada-speedboat',
  'luxor-ausfluege',
  'luxor-excursions',
  'makadi-ausfluege',
  'makadi-bay',
  'marsa-alam-excursions',
  'sharm-ausfluege',
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
