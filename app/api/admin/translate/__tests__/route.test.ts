import fs from 'node:fs';
import path from 'node:path';

describe('legacy POST /api/admin/translate safety alias', () => {
  it('re-exports the per-locale handler and contains no independent bulk side door', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/api/admin/translate/route.ts'), 'utf8');

    expect(source).toContain("export { POST } from './stream/route'");
    expect(source).not.toMatch(/autoTranslate(?:Tour|Destination|Category|AttractionPage)/);
    expect(source).not.toContain('requireAdminAuth');
  });
});
