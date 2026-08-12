#!/usr/bin/env tsx
/**
 * Regenerates the storefront dark-theme override block in app/globals.css.
 *
 *   pnpm theme:generate          rewrite the block
 *   pnpm theme:generate --check  fail if the committed CSS is stale
 *
 * The contract test enforces --check, so a component that introduces a new
 * light Tailwind utility fails CI until the block is regenerated.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  buildDarkThemeCss,
  extractGeneratedBlock,
  GENERATED_START,
} from './theme/buildDarkThemeCss';

const root = process.cwd();
const cssPath = path.join(root, 'app/globals.css');
const check = process.argv.includes('--check');

const current = fs.readFileSync(cssPath, 'utf8');
const { css, darkened, preserved } = buildDarkThemeCss(root);
const existing = extractGeneratedBlock(current);

if (check) {
  if (existing === css) {
    console.log(`✅ dark-theme block current (${darkened.length} utilities darkened).`);
    process.exit(0);
  }
  console.error('❌ app/globals.css dark-theme block is stale. Run: pnpm theme:generate');
  process.exit(1);
}

const next = existing
  ? current.replace(existing, css)
  : `${current.trimEnd()}\n\n${css}\n`;

if (next === current) {
  console.log(`✅ dark-theme block already current (${darkened.length} utilities darkened).`);
} else {
  fs.writeFileSync(cssPath, next);
  console.log(
    `✅ wrote dark-theme block to app/globals.css — ` +
    `${darkened.length} utilities darkened, ${preserved.length} preserved.`,
  );
}

if (!existing && !check) {
  console.log(`   (block inserted for the first time, marker: ${GENERATED_START.slice(0, 40)}…)`);
}
