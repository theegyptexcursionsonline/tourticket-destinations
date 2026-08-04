import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('admin shell responsive layout', () => {
  it('removes the closed mobile drawer from the flex layout', () => {
    const sidebar = source('components/admin/Sidebar.tsx');

    expect(sidebar).toContain(': "relative lg:sticky lg:top-0"');
    expect(sidebar).not.toContain('className={`relative bg-white');
    expect(sidebar).toContain('aria-label={isMobileOpen ? "Close admin navigation" : "Open admin navigation"}');
    expect(sidebar).toContain('z-[70]');
  });
});
