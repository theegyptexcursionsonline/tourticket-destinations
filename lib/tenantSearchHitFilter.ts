type TenantSearchHit = Record<string, unknown>;

const toTenantIdList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(toTenantIdList);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (value && typeof value === 'object' && 'tenantId' in value) {
    return toTenantIdList((value as { tenantId?: unknown }).tenantId);
  }

  return [];
};

export function searchHitBelongsToTenant(hit: TenantSearchHit, tenantId?: string | null): boolean {
  const normalizedTenantId = (tenantId || 'default').trim().toLowerCase();

  if (!normalizedTenantId || normalizedTenantId === 'all') {
    return true;
  }

  const hitTenantIds = [
    ...toTenantIdList(hit.tenantId),
    ...toTenantIdList(hit.tenant_id),
    ...toTenantIdList(hit.tenantIds),
    ...toTenantIdList(hit.tenant_ids),
    ...toTenantIdList(hit.brandId),
    ...toTenantIdList(hit.brandIds),
    ...toTenantIdList(hit.tenant),
    ...toTenantIdList(hit.tenants),
  ];

  if (hitTenantIds.length === 0) {
    return normalizedTenantId === 'default';
  }

  return hitTenantIds.includes(normalizedTenantId);
}

export function filterSearchHitsByTenant<T extends TenantSearchHit>(
  hits: T[],
  tenantId?: string | null
): T[] {
  return hits.filter((hit) => searchHitBelongsToTenant(hit, tenantId));
}
