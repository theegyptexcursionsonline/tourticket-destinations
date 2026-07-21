interface PreviewUrlOptions {
  tenantDomain?: string | null;
  configuredBaseUrl?: string | null;
  adminOrigin?: string | null;
}

function asOrigin(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try { return new URL(candidate).origin; } catch { return null; }
}

function storefrontOriginFromAdmin(adminOrigin?: string | null): string | null {
  const origin = asOrigin(adminOrigin);
  if (!origin) return null;
  const url = new URL(origin);
  url.hostname = url.hostname.replace(/^dashboard2?\./i, '');
  return url.origin;
}

export function storefrontPreviewUrl(publicPath: string, options: PreviewUrlOptions = {}): string {
  if (/^https?:\/\//i.test(publicPath)) return publicPath;
  const path = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  const origin = asOrigin(options.tenantDomain)
    || asOrigin(options.configuredBaseUrl)
    || storefrontOriginFromAdmin(options.adminOrigin);
  return origin ? `${origin}${path}` : path;
}
