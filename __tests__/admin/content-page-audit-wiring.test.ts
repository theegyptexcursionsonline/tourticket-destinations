import fs from 'node:fs';

const read = (file: string) => fs.readFileSync(file, 'utf8');

describe('unified Pages audit wiring', () => {
  it.each([
    ['app/api/admin/attraction-pages/route.ts', 'attraction page'],
    ['app/api/categories/route.ts', 'category page'],
  ])('%s records the persisted identity after create', (file, kind) => {
    const source = read(file);
    expect(source).toContain('registerAdminAuditDetail(contentPageAuditDetail({');
    expect(source).toContain(`kind: '${kind}'`);
    expect(source).toContain("operation: 'create'");
  });

  it.each([
    ['app/api/admin/attraction-pages/[id]/route.ts', 'attraction page'],
    ['app/api/categories/[id]/route.ts', 'category page'],
  ])('%s attributes rejected attempts and successful update/delete outcomes', (file, kind) => {
    const source = read(file);
    expect(source).toContain('contentPageAuditAttemptDetail({');
    expect(source).toContain(`kind: '${kind}'`);
    expect(source).toContain("operation: 'update'");
    expect(source).toContain("operation: 'delete'");
    expect(source.match(/registerAdminAuditDetail\(contentPageAuditDetail\(\{/g)).toHaveLength(2);
  });

  it('does not print the full page form payload into the browser console', () => {
    const source = read('components/admin/AttractionPageForm.tsx');
    expect(source).not.toContain('FRONTEND: Full payload');
    expect(source).not.toContain('Form data before submit');
  });

  it.each([
    'app/api/admin/attraction-pages/[id]/route.ts',
    'app/api/categories/[id]/route.ts',
  ])('%s compares the saved lean database result instead of hydrated schema defaults', (file) => {
    const source = read(file);
    expect(source).toMatch(/findOneAndUpdate[\s\S]*?\.lean\(\)/);
  });
});
