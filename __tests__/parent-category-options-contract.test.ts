import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('parent page category options', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/admin/pages/options/route.ts'), 'utf8');

  it('loads tenant-scoped categories into the parent selector', () => {
    expect(route).toContain('const categoryParentFilter: Record<string, unknown> = { ...parentFilter }');
    expect(route).toContain('Category.find(categoryParentFilter)');
    expect(route).toContain("kind: 'category'");
  });
});
