const TENANT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62})$/i;

export function buildAlgoliaTenantFilter(tenantId: string): string {
  const normalized = tenantId.trim();
  if (!TENANT_ID_PATTERN.test(normalized)) {
    throw new Error('Invalid storefront tenant identifier');
  }

  const value = JSON.stringify(normalized);
  return `(tenantId:${value} OR tenantIds:${value})`;
}
