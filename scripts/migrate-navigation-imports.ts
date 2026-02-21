#!/usr/bin/env tsx
/**
 * Migration Script: Replace next/link and next/navigation imports with @/i18n/navigation
 *
 * This replaces:
 *   import Link from 'next/link' → import { Link } from '@/i18n/navigation'
 *   import { useRouter } from 'next/navigation' → import { useRouter } from '@/i18n/navigation'
 *   import { usePathname } from 'next/navigation' → import { usePathname } from '@/i18n/navigation'
 *
 * Keeps as next/navigation (no i18n equivalent):
 *   useSearchParams, useParams, notFound, useSelectedLayoutSegment, ReadonlyURLSearchParams
 *
 * Skips: app/api/, lib/, scripts/, node_modules/, __tests__/
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DIRS_TO_SCAN = ['app/[locale]', 'components', 'contexts', 'hooks'];
const SKIP_DIRS = ['node_modules', '__tests__', '.next', 'app/api'];
const FILE_EXTS = ['.tsx', '.ts', '.jsx', '.js'];

// Imports that should move to @/i18n/navigation
const I18N_EXPORTS = ['Link', 'useRouter', 'usePathname', 'redirect', 'getPathname'];
// Imports that must stay with next/navigation
const NEXT_NAV_ONLY = ['useSearchParams', 'useParams', 'notFound', 'useSelectedLayoutSegment', 'ReadonlyURLSearchParams'];

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

function getAllFiles(dirPath: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) return files;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.some(skip => relativePath.startsWith(skip) || entry.name === skip)) {
        continue;
      }
      files.push(...getAllFiles(fullPath));
    } else if (FILE_EXTS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function processFile(filePath: string): void {
  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  const relativePath = path.relative(ROOT, filePath);

  // 1. Replace `import Link from 'next/link'` or `import Link from "next/link"`
  const linkImportRegex = /import\s+Link\s+from\s+['"]next\/link['"]\s*;?/g;
  if (linkImportRegex.test(content)) {
    content = content.replace(linkImportRegex, `import { Link } from '@/i18n/navigation';`);
    modified = true;
    totalReplacements++;
    console.log(`  ✓ ${relativePath}: Link import → @/i18n/navigation`);
  }

  // 2. Handle `import { ... } from 'next/navigation'`
  const navImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]next\/navigation['"]\s*;?/g;
  let match;

  // Reset regex
  const navMatches: { fullMatch: string; imports: string }[] = [];
  while ((match = navImportRegex.exec(content)) !== null) {
    navMatches.push({ fullMatch: match[0], imports: match[1] });
  }

  for (const navMatch of navMatches) {
    const importNames = navMatch.imports.split(',').map(s => s.trim()).filter(Boolean);

    const i18nImports: string[] = [];
    const nextNavImports: string[] = [];

    for (const name of importNames) {
      // Handle type imports
      const cleanName = name.replace(/^type\s+/, '');
      if (I18N_EXPORTS.includes(cleanName)) {
        i18nImports.push(name);
      } else {
        nextNavImports.push(name);
      }
    }

    if (i18nImports.length === 0) {
      // Nothing to migrate in this import
      continue;
    }

    let replacement = '';

    if (i18nImports.length > 0) {
      replacement += `import { ${i18nImports.join(', ')} } from '@/i18n/navigation';`;
    }

    if (nextNavImports.length > 0) {
      if (replacement) replacement += '\n';
      replacement += `import { ${nextNavImports.join(', ')} } from 'next/navigation';`;
    }

    content = content.replace(navMatch.fullMatch, replacement);
    modified = true;
    totalReplacements++;

    const migratedStr = i18nImports.join(', ');
    const keptStr = nextNavImports.length > 0 ? ` (kept: ${nextNavImports.join(', ')})` : '';
    console.log(`  ✓ ${relativePath}: {${migratedStr}} → @/i18n/navigation${keptStr}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
  }
}

console.log('🔄 Migrating next/link and next/navigation imports to @/i18n/navigation...\n');

for (const dir of DIRS_TO_SCAN) {
  const dirPath = path.join(ROOT, dir);
  const files = getAllFiles(dirPath);
  for (const file of files) {
    processFile(file);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files scanned: ${totalFiles}`);
console.log(`   Files modified: ${modifiedFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('\n✅ Navigation import migration complete!');
