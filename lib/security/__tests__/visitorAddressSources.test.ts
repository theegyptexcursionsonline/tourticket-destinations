import fs from 'fs';
import path from 'path';

/**
 * Behind the site's edge function, a server function's own client headers name the edge,
 * and forwarding headers name whatever the client wrote. Only the visitor-address modules
 * may read them; everything else asks requestVisitor() (lib/security/requestVisitor.ts).
 */
const ROOT = process.cwd();
const ALLOWED = new Set([
  'lib/security/visitorAddress.ts',
  'lib/security/requestVisitor.ts',
]);
const CLIENT_ADDRESS_HEADER = /['"`](x-forwarded-for|x-real-ip|x-nf-client-connection-ip|cf-connecting-ip|true-client-ip|x-client-ip)['"`]/i;

function sourceFiles(directory: string): string[] {
  const absolute = path.join(ROOT, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(relative);
    }
    return /\.(tsx?|jsx?|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [relative] : [];
  });
}

describe('client address headers', () => {
  it('are read only by the visitor-address modules', () => {
    const files = ['proxy.ts', ...['app', 'lib', 'components', 'netlify/functions'].flatMap(sourceFiles)];
    expect(files.length).toBeGreaterThan(100);
    const readers = files.filter((file) => !ALLOWED.has(file)
      && CLIENT_ADDRESS_HEADER.test(fs.readFileSync(path.join(ROOT, file), 'utf8')));
    expect(readers).toEqual([]);
  });
});
