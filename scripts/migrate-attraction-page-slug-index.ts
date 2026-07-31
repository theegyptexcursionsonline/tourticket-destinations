/**
 * Drop the legacy globally-unique `slug_1` index on attractionpages.
 *
 * The collection carries two uniqueness rules: the correct per-tenant
 * `{tenantId, slug}` and a leftover global `{slug}` from before the platform
 * was multi-tenant. The app checks for duplicates per tenant, so that check
 * passes and the insert then fails on the global index — which is why creating
 * a page whose slug exists on another brand reported an unexplained error.
 *
 * Dry run (default):
 *   npx tsx scripts/migrate-attraction-page-slug-index.ts
 *
 * Apply (requires naming the database, so this cannot run against the wrong
 * one by accident):
 *   npx tsx scripts/migrate-attraction-page-slug-index.ts --apply --confirm <dbName>
 */
import mongoose from 'mongoose';

const LEGACY_INDEX = 'slug_1';
const SCOPED_INDEX_KEY = { tenantId: 1, slug: 1 };

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const confirmIndex = args.indexOf('--confirm');
  const confirmed = confirmIndex >= 0 ? args[confirmIndex + 1] : null;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');
  const dbName = db.databaseName;
  const collection = db.collection('attractionpages');

  const indexes = await collection.indexes();
  const legacy = indexes.find((index) => index.name === LEGACY_INDEX);
  const scoped = indexes.find(
    (index) => JSON.stringify(index.key) === JSON.stringify(SCOPED_INDEX_KEY) && index.unique,
  );

  console.log(`database: ${dbName}`);
  console.log(`legacy global unique slug index present: ${Boolean(legacy?.unique)}`);
  console.log(`tenant-scoped unique index present: ${Boolean(scoped)}`);

  if (!legacy?.unique) {
    console.log('Nothing to do — the legacy index is already gone.');
    await mongoose.disconnect();
    return;
  }

  if (!scoped) {
    throw new Error(
      'Refusing to drop the legacy index: the tenant-scoped unique index does not exist, ' +
      'so dropping it would leave slugs unconstrained.',
    );
  }

  // Removing a uniqueness rule cannot break existing rows, but a duplicate
  // would mean the collection already relies on it in some way we have not
  // accounted for, so report before changing anything.
  const duplicates = await collection.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'total' },
  ]).toArray();
  console.log(`slugs currently duplicated across tenants: ${duplicates[0]?.total ?? 0}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply --confirm ' + dbName + ' to drop it.');
    await mongoose.disconnect();
    return;
  }

  if (confirmed !== dbName) {
    throw new Error(`--confirm must name the target database (${dbName})`);
  }

  await collection.dropIndex(LEGACY_INDEX);
  console.log(`Dropped ${LEGACY_INDEX}. Per-tenant uniqueness remains enforced by {tenantId, slug}.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
