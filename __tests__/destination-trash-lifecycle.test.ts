import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/**
 * Client report (MT sheet, 02 Sep): "unable to delete destinations".
 *
 * The DELETE route refused with a 400 whenever any tour still pointed at the
 * destination, telling the caller to retry with force=true — which the admin UI
 * never did. EEO had already moved to a Trash lifecycle; this brings the
 * multi-tenant platform to the same behaviour.
 */
describe('destination Trash lifecycle', () => {
  const route = read('app/api/admin/destinations/[id]/route.ts');
  const model = read('lib/models/Destination.ts');
  const manager = read('app/admin/destinations/DestinationManager.tsx');
  const page = read('app/admin/destinations/page.tsx');
  const listRoute = read('app/api/admin/destinations/route.ts');

  it('archives instead of refusing when tours are linked', () => {
    expect(route).toContain('archivedAt: new Date()');
    expect(route).toContain("message: 'Destination moved to Trash. Linked tours were preserved.'");
    // The blocking branch and its force escape hatch are gone.
    expect(route).not.toContain('Cannot delete destination');
    expect(route).not.toContain("searchParams.get('force')");
    expect(route).not.toContain('findOneAndDelete');
    // Tours are never unlinked or deleted as a side effect any more.
    expect(route).not.toContain('$unset: { destination');
  });

  it('records the archive on the model so the storefront filters can see it', () => {
    expect(model).toContain('archivedAt?: Date | null;');
    expect(model).toContain('archivedAt: { type: Date, default: null, index: true }');
    expect(model).toContain('archivedBy');
  });

  it('restores from Trash as a draft, and never lets a client set the archive fields', () => {
    expect(route).toContain('const restoreFromTrash = data.restoreFromTrash === true;');
    expect(route).toContain('delete data.archivedAt;');
    expect(route).toContain('delete data.archivedBy;');
    expect(route).toContain('archivedAt: null, archivedBy: null, isPublished: false');
    expect(route).toContain("message: 'Destination restored from Trash as a draft.'");
  });

  it('unpublishes on archive so it leaves the storefront immediately', () => {
    expect(route).toContain('isPublished: false, archivedAt: new Date()');
  });

  it('offers Move to Trash and Restore in the admin, naming the consequence', () => {
    expect(manager).toContain('const handleMoveToTrash =');
    expect(manager).toContain('const handleRestore =');
    expect(manager).toContain('It will be unpublished, and linked tours will be preserved.');
    expect(manager).toContain("body: JSON.stringify({ restoreFromTrash: true })");
    // Failures surface the server's reason instead of a generic message.
    expect(manager).toContain("throw new Error(payload.error || 'Failed to move to Trash.')");
    expect(manager).not.toContain('const handleDelete =');
  });

  it('keeps unpublished drafts separate from deleted destinations', () => {
    expect(manager).toContain("useState<'published' | 'draft' | 'trash'>('published')");
    expect(manager).toContain("listView === 'trash'");
    expect(manager).toContain("listView === 'published' ? destination.isPublished : !destination.isPublished");
    expect(manager).toContain("dest.archivedAt ? 'Trash' : dest.isPublished ? 'Published' : 'Draft'");
  });

  it('loads destinations through the tenant-scoped API instead of an unscoped page query', () => {
    // The page used to run Destination.find({}) and Tour.find({}) with no tenant
    // filter, so any manageContent admin saw every brand's destinations.
    // Match real calls, not the comment that explains why they were removed.
    expect(page).not.toMatch(/await\s+Destination\.find/);
    expect(page).not.toMatch(/await\s+Tour\.find/);
    expect(page).toContain('<DestinationManager />');
    expect(manager).toContain("fetch(`/api/admin/destinations");
    expect(manager).toContain('const loadDestinations = useCallback');
    // A failed load must not read as an empty list.
    expect(manager).toContain('setListError');
  });

  it('computes tour counts inside the same tenant clause as the destinations', () => {
    expect(listRoute).toContain('Tour.aggregate');
    expect(listRoute).toContain('tourFilter.$or = [{ tenantId: tenantClause }, { tenantIds: tenantClause }]');
    expect(listRoute).toContain('countByDestination');
  });
});
