const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) {
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function patchRunConfig(targetPath) {
  if (!targetPath.endsWith('run-config.json') || !fs.existsSync(targetPath)) {
    return false;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  const parsed = JSON.parse(original);

  if (parsed.enableUseCacheHandler === false) {
    return false;
  }

  parsed.enableUseCacheHandler = false;
  fs.writeFileSync(targetPath, `${JSON.stringify(parsed)}\n`);
  return true;
}

function patchStorageFile(targetPath) {
  if (!targetPath.endsWith(path.join('run', 'storage', 'storage.cjs')) || !fs.existsSync(targetPath)) {
    return false;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  if (original.includes('__NETLIFY_BLOBS_FALLBACK_STORE__')) {
    return false;
  }

  const fallbackSnippet = [
    'var fallbackBlobStoreData = globalThis.__NETLIFY_BLOBS_FALLBACK_STORE__ || (globalThis.__NETLIFY_BLOBS_FALLBACK_STORE__ = /* @__PURE__ */ new Map());',
    'var createFallbackBlobStore = () => ({',
    '  async getWithMetadata(key) {',
    '    return { data: fallbackBlobStoreData.get(key) ?? null, etag: void 0 };',
    '  },',
    '  async setJSON(key, value) {',
    '    fallbackBlobStoreData.set(key, value);',
    '    return { etag: void 0 };',
    '  }',
    '});'
  ].join('\n');

  let patched = original.replace(
    'var encodeBlobKey = async (key) => {\n',
    `${fallbackSnippet}\nvar encodeBlobKey = async (key) => {\n`
  );

  patched = patched.replace(
    'var getMemoizedKeyValueStoreBackedByRegionalBlobStore = (...args) => {\n  const store = (0, import_regional_blob_store.getRegionalBlobStore)(...args);\n',
    'var getMemoizedKeyValueStoreBackedByRegionalBlobStore = (...args) => {\n  let store;\n  try {\n    store = (0, import_regional_blob_store.getRegionalBlobStore)(...args);\n  } catch (_error) {\n    store = createFallbackBlobStore();\n  }\n'
  );

  if (patched === original) {
    return false;
  }

  fs.writeFileSync(targetPath, patched);
  return true;
}

function patchFiles(baseDir, utils) {
  const allFiles = walk(path.join(baseDir, '.netlify'));
  const patchedRunConfigs = [];
  const patchedStorageFiles = [];

  for (const file of allFiles) {
    if (patchRunConfig(file)) {
      patchedRunConfigs.push(file);
    }
    if (patchStorageFile(file)) {
      patchedStorageFiles.push(file);
    }
  }

  if (patchedRunConfigs.length === 0 && patchedStorageFiles.length === 0) {
    utils.status.show({
      title: 'Netlify runtime patch skipped',
      summary: 'No generated Netlify runtime files required patching.',
    });
    return;
  }

  const summary = [
    ...patchedRunConfigs.map((file) => `Disabled use-cache handler in ${file}`),
    ...patchedStorageFiles.map((file) => `Added safe Blobs fallback in ${file}`),
  ].join('\n');

  utils.status.show({
    title: 'Patched Netlify runtime output',
    summary,
  });
}

module.exports = {
  onPostBuild({ utils }) {
    patchFiles(process.cwd(), utils);
  },
};
