#!/usr/bin/env tsx
/**
 * RTL Migration Script
 * Migrates directional Tailwind CSS classes to logical property equivalents
 * for RTL (Right-to-Left) language support.
 *
 * Usage: npx tsx scripts/migrate-rtl.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// Directories to scan
const SCAN_DIRS = ['app', 'components', 'contexts', 'hooks'];
const FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// Replacement rules: [regex pattern, replacement]
// These map physical properties to logical equivalents
const REPLACEMENTS: [RegExp, string][] = [
  // Margin: ml -> ms, mr -> me
  [/\bml-(\d+(?:\.\d+)?|px|auto|\[[\w.%-]+\])/g, 'ms-$1'],
  [/\bmr-(\d+(?:\.\d+)?|px|auto|\[[\w.%-]+\])/g, 'me-$1'],
  [/\b-ml-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, '-ms-$1'],
  [/\b-mr-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, '-me-$1'],

  // Padding: pl -> ps, pr -> pe
  [/\bpl-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'ps-$1'],
  [/\bpr-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'pe-$1'],

  // Text alignment: text-left -> text-start, text-right -> text-end
  [/\btext-left\b/g, 'text-start'],
  [/\btext-right\b/g, 'text-end'],

  // Border: border-l -> border-s, border-r -> border-e
  [/\bborder-l-(\d+|\[[\w.%-]+\])/g, 'border-s-$1'],
  [/\bborder-r-(\d+|\[[\w.%-]+\])/g, 'border-e-$1'],
  [/\bborder-l\b(?!-)/g, 'border-s'],
  [/\bborder-r\b(?!-)/g, 'border-e'],

  // Rounded corners: rounded-l -> rounded-s, rounded-r -> rounded-e
  [/\brounded-l-(\w+)/g, 'rounded-s-$1'],
  [/\brounded-r-(\w+)/g, 'rounded-e-$1'],
  [/\brounded-l\b(?!-)/g, 'rounded-s'],
  [/\brounded-r\b(?!-)/g, 'rounded-e'],
  // Top-left/top-right, bottom-left/bottom-right
  [/\brounded-tl-(\w+)/g, 'rounded-ts-$1'],
  [/\brounded-tr-(\w+)/g, 'rounded-te-$1'],
  [/\brounded-bl-(\w+)/g, 'rounded-bs-$1'],
  [/\brounded-br-(\w+)/g, 'rounded-be-$1'],
  [/\brounded-tl\b(?!-)/g, 'rounded-ts'],
  [/\brounded-tr\b(?!-)/g, 'rounded-te'],
  [/\brounded-bl\b(?!-)/g, 'rounded-bs'],
  [/\brounded-br\b(?!-)/g, 'rounded-be'],

  // Positioning: left -> start, right -> end
  // Note: Only replace within Tailwind context (preceded by space, quote, or class separator)
  [/\bleft-(\d+(?:\.\d+)?|px|auto|full|\[[\w.%-]+\])/g, 'start-$1'],
  [/\bright-(\d+(?:\.\d+)?|px|auto|full|\[[\w.%-]+\])/g, 'end-$1'],
  [/\b-left-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, '-start-$1'],
  [/\b-right-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, '-end-$1'],

  // Float: float-left -> float-start, float-right -> float-end
  [/\bfloat-left\b/g, 'float-start'],
  [/\bfloat-right\b/g, 'float-end'],

  // Clear: clear-left -> clear-start, clear-right -> clear-end
  [/\bclear-left\b/g, 'clear-start'],
  [/\bclear-right\b/g, 'clear-end'],

  // Scroll margin/padding: scroll-ml -> scroll-ms, etc.
  [/\bscroll-ml-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'scroll-ms-$1'],
  [/\bscroll-mr-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'scroll-me-$1'],
  [/\bscroll-pl-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'scroll-ps-$1'],
  [/\bscroll-pr-(\d+(?:\.\d+)?|px|\[[\w.%-]+\])/g, 'scroll-pe-$1'],

  // Divide: divide-x stays (it's horizontal, not directional)
  // space-x stays (it's horizontal, not directional)
];

// Track statistics
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;
const changesByFile: Map<string, number> = new Map();

function getFiles(dir: string): string[] {
  const results: string[] = [];
  const absDir = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(absDir)) return results;

  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...getFiles(path.join(dir, entry.name)));
      }
    } else if (FILE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function migrateFile(filePath: string): void {
  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf-8');
  let fileChanges = 0;
  let modified = content;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const matches = modified.match(pattern);
    if (matches) {
      fileChanges += matches.length;
      modified = modified.replace(pattern, replacement);
    }
  }

  if (fileChanges > 0) {
    modifiedFiles++;
    totalReplacements += fileChanges;
    changesByFile.set(path.relative(process.cwd(), filePath), fileChanges);

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, modified, 'utf-8');
    }
  }
}

// Main
console.log(`\n🔄 RTL Migration Script${DRY_RUN ? ' (DRY RUN)' : ''}`);
console.log('='.repeat(60));

for (const dir of SCAN_DIRS) {
  const files = getFiles(dir);
  for (const file of files) {
    migrateFile(file);
  }
}

console.log(`\n📊 Results:`);
console.log(`   Files scanned: ${totalFiles}`);
console.log(`   Files modified: ${modifiedFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);

if (changesByFile.size > 0) {
  console.log(`\n📝 Modified files:`);
  const sorted = [...changesByFile.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sorted) {
    console.log(`   ${count.toString().padStart(4)} changes: ${file}`);
  }
}

if (DRY_RUN) {
  console.log(`\n⚠️  DRY RUN — no files were modified. Remove --dry-run to apply changes.`);
} else {
  console.log(`\n✅ Migration complete!`);
}
