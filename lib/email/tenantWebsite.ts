function normalizeHttpOrigin(value: string): string | undefined {
  const candidate = value.trim();
  if (!candidate) return undefined;

  const withScheme = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Email assets must resolve against the tenant's public site. A shared checkout
 * or webhook base URL can belong to another brand and produce broken logos.
 */
export function resolveTenantEmailWebsite(
  tenantDomain?: string | null,
  fallbackBaseUrl?: string | null,
): string | undefined {
  return normalizeHttpOrigin(tenantDomain || '')
    || normalizeHttpOrigin(fallbackBaseUrl || '');
}
