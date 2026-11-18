/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { copyMaplibreWorker, WORKER_PUBLIC_PATH } = require('../../scripts/copy-maplibre-worker.cjs');

describe('MapLibre worker copy', () => {
  it('copies the installed worker to the public path the map uses', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'maplibre-worker-'));
    fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(root, 'node_modules'));
    const { target, bytes } = copyMaplibreWorker(root);
    expect(target).toBe(path.join(root, 'public', WORKER_PUBLIC_PATH));
    expect(bytes).toBeGreaterThan(100000);
    const installed = fs.readFileSync(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'));
    expect(fs.readFileSync(target).equals(installed)).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('runs before every build and dev start, and the map uses the same path', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toMatch(/^node scripts\/copy-maplibre-worker\.cjs && /);
    expect(pkg.scripts.predev).toBe('node scripts/copy-maplibre-worker.cjs');
    const map = fs.readFileSync(path.join(process.cwd(), 'components/tours/InteractiveItineraryMap.tsx'), 'utf8');
    expect(map).toContain(`const MAPLIBRE_WORKER_PATH = '${WORKER_PUBLIC_PATH}';`);
  });
});
