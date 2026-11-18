#!/usr/bin/env node
/**
 * MapLibre 6 ships its map worker as a separate ES module that it loads from
 * a sibling URL of its own bundle. Bundlers do not emit that sibling file, so
 * the map drew no tiles ("Worker failed to load"). The build copies the worker
 * from the installed package into public/, and the map points MapLibre at it
 * (setWorkerUrl), so the worker is always the same version as the library.
 */
const fs = require('node:fs');
const path = require('node:path');

const WORKER_PUBLIC_PATH = '/vendor/maplibre/maplibre-gl-worker.mjs';

function copyMaplibreWorker(root = process.cwd()) {
  const source = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs', { paths: [root] });
  const target = path.join(root, 'public', WORKER_PUBLIC_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return { source, target, bytes: fs.statSync(target).size };
}

module.exports = { copyMaplibreWorker, WORKER_PUBLIC_PATH };

if (require.main === module) {
  const { target, bytes } = copyMaplibreWorker();
  if (bytes < 1000) {
    console.error(`MapLibre worker copy looks wrong (${bytes} bytes at ${target}).`);
    process.exit(1);
  }
  console.log(`MapLibre worker copied to ${path.relative(process.cwd(), target)} (${bytes} bytes).`);
}
