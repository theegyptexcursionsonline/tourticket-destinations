// components/ComingSoonWrapper.tsx
// Server Component that fetches tenant data and passes to client ComingSoonPage

import ComingSoonPage from '@/components/ComingSoonPage';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export default async function ComingSoonWrapper() {
  // Get tenant ID from the current request (server-side)
  const tenantId = await getTenantFromRequest();
  
  // Fetch the tenant's public configuration
  const tenant = await getTenantPublicConfig(tenantId);
  
  return <ComingSoonPage tenant={tenant} />;
}
