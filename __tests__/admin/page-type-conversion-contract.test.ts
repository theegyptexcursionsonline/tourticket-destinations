import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

// Client request (MT sheet, 31 Aug): the Edit Category page must offer the
// same "Change page type safely" block as EEO.
describe('admin page type conversion', () => {
  it('ships the transfer control with the same wording as EEO', () => {
    const component = read('app/admin/pages/PageTypeConversionActions.tsx');
    expect(component).toContain('Change page type safely');
    expect(component).toContain('Create {LABELS[targetKind]} draft');
    expect(component).toContain("'category-landing': 'Category 2'");
    expect(component).toContain("fetch('/api/admin/pages/convert'");
  });

  it('keeps the source page unchanged and creates an unpublished target draft inside its tenant', () => {
    const route = read('app/api/admin/pages/convert/route.ts');
    expect(route).toContain("permissions: ['manageContent']");
    expect(route).toContain('archivedAt: null');
    expect(route).toContain('createUniqueDuplicate({');
    expect(route).toContain('canAccessTenant(auth, tenantId)');
    expect(route).toContain('tenantFilter: { tenantId }');
    expect(route).not.toContain('findOneAndDelete');
    expect(route).not.toContain('deleteOne');
    expect(route).not.toContain('updateMany');
    expect(route).not.toContain('DEFAULT_TENANT_FILTER');
  });
});
