/**
 * Layout-only authorization regression guard (PLATFORM #132/#133 class).
 *
 * Next renders a layout and its page in parallel. The admin layout is a client
 * shell that shows the sign-in form to a signed-out browser, but a server
 * `page.tsx` that reads the database has already streamed that data into the
 * response by then — `curl` received every brand's blog posts and any brand's
 * category by id from the dashboard host with no cookie at all.
 *
 * Rule enforced here, for every route file under app/admin: no server page,
 * layout or special file may reach the database (directly or through any
 * server module it imports). Admin pages are client shells whose data comes
 * only from the guarded, brand-scoped admin APIs. A page that truly needs
 * server-side data must first get its own authorization check (the flagship
 * repository's `authorizeAdminPage` pattern) and this test updated with it.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ADMIN_DIR = path.join(ROOT, 'app/admin');
const ROUTE_FILE = /^(page|layout|template|loading|error|not-found|default)\.(t|j)sx?$/;

// Anything that reads the database on the server.
const DATA_SPECIFIERS = [
  /^mongoose$/,
  /^mongodb$/,
  /^@\/lib\/dbConnect$/,
  /^@\/lib\/models(\/|$)/,
];

function readSource(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function isClientModule(source: string): boolean {
  return /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*\s*['"]use client['"]/.test(source);
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImport = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(staticImport)) {
    if (match[2]) continue; // type-only imports never run
    specifiers.push(match[3]);
  }
  for (const match of source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveLocal(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

const reachCache = new Map<string, boolean>();

/** True when rendering this server module can read the database. */
function reachesData(file: string, stack = new Set<string>()): boolean {
  if (reachCache.has(file)) return reachCache.get(file)!;
  if (stack.has(file)) return false;
  stack.add(file);
  const source = readSource(file);
  let result = false;
  if (!isClientModule(source)) {
    for (const specifier of importSpecifiers(source)) {
      if (DATA_SPECIFIERS.some((pattern) => pattern.test(specifier))) {
        result = true;
        break;
      }
      const local = resolveLocal(file, specifier);
      if (local && /\.(t|j)sx?$/.test(local) && reachesData(local, stack)) {
        result = true;
        break;
      }
    }
  }
  stack.delete(file);
  reachCache.set(file, result);
  return result;
}

function adminRouteFiles(dir = ADMIN_DIR): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return adminRouteFiles(full);
    return ROUTE_FILE.test(entry.name) ? [full] : [];
  });
}

const relative = (file: string) => path.relative(ADMIN_DIR, file);
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
const routeFiles = adminRouteFiles();
const serverRouteFiles = routeFiles.filter((file) => !isClientModule(readSource(file)));
const dataPages = serverRouteFiles.filter(
  (file) => /^page\./.test(path.basename(file)) && reachesData(file),
);

describe('admin pages never read data on the server', () => {
  it('discovers the admin route files (fails loudly if detection breaks)', () => {
    expect(routeFiles.length).toBeGreaterThan(20);
    expect(serverRouteFiles.length).toBeGreaterThan(5);
  });

  it.each(serverRouteFiles.map((file) => [relative(file), file]))(
    '%s does not reach the database',
    (_label, file) => {
      expect(reachesData(file)).toBe(false);
    },
  );

  it('no admin page is server-rendered from the database', () => {
    expect(dataPages.map(relative)).toEqual([]);
  });

  it('the detector sees a model import as a data read', () => {
    const probe = path.join(ROOT, 'app/api/admin/blog/route.ts');
    expect(importSpecifiers(readSource(probe))).toEqual(
      expect.arrayContaining(['@/lib/dbConnect', '@/lib/models/Blog']),
    );
    expect(reachesData(probe)).toBe(true);
  });

  it('the detector treats client components as leaves', () => {
    const probe = path.join(ROOT, 'app/admin/blog/BlogManager.tsx');
    expect(isClientModule(readSource(probe))).toBe(true);
    expect(reachesData(probe)).toBe(false);
  });

  it('the blog page renders the API-backed manager without server data', () => {
    const source = withoutComments(readSource(path.join(ADMIN_DIR, 'blog/page.tsx')));
    expect(source).not.toMatch(/dbConnect|@\/lib\/models|Blog\.find/);
    expect(source).toContain('<BlogManager />');
  });

  it('the category id route reads nothing and forwards to the editor', () => {
    const source = withoutComments(readSource(path.join(ADMIN_DIR, 'categories/[id]/page.tsx')));
    expect(source).not.toMatch(/dbConnect|@\/lib\/models|findById/);
    expect(source).toContain('/edit');
  });
});
