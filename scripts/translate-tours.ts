// scripts/translate-tours.ts
// CLI script to translate all published tours using OpenAI API
// Usage: npx tsx scripts/translate-tours.ts [--force] [--tenant <tenantId>] [--batch <size>]

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const tenantIdx = args.indexOf('--tenant');
  const tenantId = tenantIdx !== -1 ? args[tenantIdx + 1] : undefined;
  const batchIdx = args.indexOf('--batch');
  const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1], 10) : 5;

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log('=== Tour Translation Script ===');
  console.log(`Force retranslate: ${force}`);
  console.log(`Tenant: ${tenantId || 'all'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log('');

  // Dynamic import to use path aliases via tsx
  const { translateAllTours } = await import('../lib/translation/translateService');

  const result = await translateAllTours({ tenantId, force, batchSize });

  console.log('');
  console.log('=== Translation Complete ===');
  console.log(`Translated: ${result.translated}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Skipped: ${result.skipped}`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
