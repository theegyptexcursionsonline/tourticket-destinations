import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('destination preview action', () => {
  const source = readFileSync(join(process.cwd(), 'app/admin/destinations/DestinationManager.tsx'), 'utf8');

  it('opens the owning brand destination route for published destinations', () => {
    expect(source).toContain('tenantDomain: tenants.find');
    expect(source).toContain('`/destinations/${dest.slug || \'\'}`');
    expect(source).toContain('aria-label={`Preview ${dest.name} on live site`}');
  });

  it('disables preview for unpublished drafts and keeps actions visible on mobile', () => {
    expect(source).toContain('Preview unavailable until published');
    expect(source).toContain('opacity-100');
    expect(source).toContain('sm:opacity-0');
  });
});
