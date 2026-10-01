/**
 * Every admin API handler — reads included — must establish who is calling
 * before it touches the database. The mutation-audit contract only covers
 * POST/PUT/PATCH/DELETE and only checks that a guard is mentioned somewhere in
 * the file; this walks each exported handler (and the local helpers it calls)
 * and compares the position of the first authorization call with the first
 * database access.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const ADMIN_API = path.join(ROOT, 'app/api/admin');
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

const AUTH_CALLS = new Set([
  'requireAdminAuth',
  'verifyAdmin',
  'verifyContentEngine',
  // Content-engine receivers: verifies the bearer token before parsing anything.
  'parseContentEngineRequest',
]);
const CONNECT_CALLS = new Set(['dbConnect']);

// Handlers whose credential is the request itself, so they must read before
// they can decide. Each is covered by its own route tests.
const SELF_AUTHENTICATING: Record<string, string> = {
  'login/route.ts POST': 'the submitted password is the credential',
  'accept-invitation/route.ts GET': 'the single-use invitation token is the credential',
  'accept-invitation/route.ts POST': 'the single-use invitation token is the credential',
};

// Handlers that are public on purpose and must never read anything.
const PUBLIC_WITHOUT_DATA: Record<string, string> = {
  'logout/route.ts POST': "only expires the caller's own session cookie",
};

type Fn = ts.FunctionLikeDeclaration;

function routeFiles(dir = ADMIN_API): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return /^route\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

interface Order {
  auth: number;
  data: number;
}

function analyze(file: string): Array<{ handler: string; order: Order | null }> {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const localFunctions = new Map<string, Fn>();
  const modelImports = new Set<string>();
  const exported: Array<{ name: string; target: ts.Node | undefined }> = [];

  const isExported = (node: ts.Node) =>
    ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  source.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      if (/^@\/lib\/models\//.test(from) && node.importClause && !node.importClause.isTypeOnly) {
        if (node.importClause.name) modelImports.add(node.importClause.name.text);
        const bindings = node.importClause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) if (!element.isTypeOnly) modelImports.add(element.name.text);
        }
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      localFunctions.set(node.name.text, node);
      if (isExported(node) && METHODS.has(node.name.text)) exported.push({ name: node.name.text, target: node });
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const init = declaration.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          localFunctions.set(declaration.name.text, init);
        }
        if (isExported(node) && METHODS.has(declaration.name.text)) {
          exported.push({ name: declaration.name.text, target: init });
        }
      }
    }
  });

  function resolve(target: ts.Node | undefined): Fn | null {
    if (!target) return null;
    if (ts.isFunctionDeclaration(target) || ts.isArrowFunction(target) || ts.isFunctionExpression(target)) return target;
    if (ts.isIdentifier(target)) return localFunctions.get(target.text) ?? null;
    if (ts.isCallExpression(target)) {
      // export const POST = withAdminAudit(POSTHandler)
      for (const argument of target.arguments) {
        const resolved = resolve(argument);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  function rootIdentifier(expression: ts.Expression): string | null {
    let current: ts.Expression = expression;
    while (ts.isPropertyAccessExpression(current) || ts.isCallExpression(current)) {
      current = current.expression;
    }
    return ts.isIdentifier(current) ? current.text : null;
  }

  function order(fn: Fn, seen: Set<string>): Order {
    const result: Order = { auth: Infinity, data: Infinity };
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const at = node.getStart(source);
        const name = ts.isIdentifier(callee)
          ? callee.text
          : ts.isPropertyAccessExpression(callee)
            ? callee.name.text
            : null;
        if (name && AUTH_CALLS.has(name)) result.auth = Math.min(result.auth, at);
        if (ts.isIdentifier(callee) && CONNECT_CALLS.has(callee.text)) result.data = Math.min(result.data, at);
        if (ts.isPropertyAccessExpression(callee)) {
          const root = rootIdentifier(callee.expression);
          if (root && modelImports.has(root)) result.data = Math.min(result.data, at);
        }
        if (ts.isIdentifier(callee) && localFunctions.has(callee.text) && !seen.has(callee.text)) {
          const inner = order(localFunctions.get(callee.text)!, new Set([...seen, callee.text]));
          // A helper that authenticates before it reads counts as authenticating here.
          if (inner.auth < inner.data) result.auth = Math.min(result.auth, at);
          else if (inner.data !== Infinity) result.data = Math.min(result.data, at);
        }
      }
      ts.forEachChild(node, visit);
    };
    if (fn.body) visit(fn.body);
    return result;
  }

  return exported.map(({ name, target }) => {
    const fn = resolve(target);
    return { handler: name, order: fn ? order(fn, new Set()) : null };
  });
}

const handlers = routeFiles().flatMap((file) =>
  analyze(file).map(({ handler, order }) => ({
    key: `${path.relative(ADMIN_API, file)} ${handler}`,
    order,
  })),
);

describe('admin API handlers authenticate before reading', () => {
  it('finds the admin API surface (fails loudly if discovery breaks)', () => {
    expect(handlers.length).toBeGreaterThan(80);
    expect(handlers.filter(({ order }) => order === null).map(({ key }) => key)).toEqual([]);
  });

  it('every handler that reads the database authorizes the caller first', () => {
    const offenders = handlers
      .filter(({ key }) => !(key in SELF_AUTHENTICATING))
      .filter(({ order }) => order && order.data !== Infinity && !(order.auth < order.data))
      .map(({ key }) => key);
    expect(offenders).toEqual([]);
  });

  it('every remaining handler still authorizes the caller', () => {
    const unauthenticated = handlers
      .filter(({ key }) => !(key in SELF_AUTHENTICATING) && !(key in PUBLIC_WITHOUT_DATA))
      .filter(({ order }) => order && order.auth === Infinity)
      .map(({ key }) => key);
    expect(unauthenticated).toEqual([]);
  });

  it('the deliberately public handlers read nothing', () => {
    for (const key of Object.keys(PUBLIC_WITHOUT_DATA)) {
      const handler = handlers.find((entry) => entry.key === key);
      if (!handler) continue;
      expect(handler.order!.data).toBe(Infinity);
    }
  });

  it('the self-authenticating exceptions still exist and still read', () => {
    for (const key of Object.keys(SELF_AUTHENTICATING)) {
      const handler = handlers.find((entry) => entry.key === key);
      expect(handler).toBeDefined();
      expect(handler!.order!.data).not.toBe(Infinity);
    }
  });

  it('the analyzer flags a read placed before the guard', () => {
    const probe = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'admin-route-probe-')), 'route.ts');
    fs.writeFileSync(
      probe,
      [
        "import Blog from '@/lib/models/Blog';",
        "import dbConnect from '@/lib/dbConnect';",
        'async function load() { await dbConnect(); return Blog.find({}); }',
        'export async function GET(request) { const rows = await load(); await requireAdminAuth(request); return rows; }',
        'export async function POST(request) { await requireAdminAuth(request); return Blog.find({}); }',
      ].join('\n'),
    );
    try {
      const [get, post] = analyze(probe);
      expect(get.order!.data).toBeLessThan(get.order!.auth);
      expect(post.order!.auth).toBeLessThan(post.order!.data);
    } finally {
      fs.rmSync(path.dirname(probe), { recursive: true, force: true });
    }
  });
});
