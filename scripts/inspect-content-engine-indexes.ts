/**
 * Read-only preflight for Content Engine receiver index migrations.
 *
 * This script deliberately has no apply mode. It only lists current indexes,
 * flags conflicting global uniques, and reports duplicate compound-key groups.
 */
import mongoose from 'mongoose';

type IndexRequirement = {
  collection: string;
  key: Record<string, 1>;
  label: string;
  disallowedGlobalUnique?: string[];
};

const REQUIREMENTS: IndexRequirement[] = [
  { collection: 'blogs', key: { tenantId: 1, slug: 1 }, label: 'blog tenant slug', disallowedGlobalUnique: ['slug'] },
  { collection: 'destinations', key: { tenantId: 1, slug: 1 }, label: 'destination tenant slug', disallowedGlobalUnique: ['slug'] },
  { collection: 'destinations', key: { tenantId: 1, name: 1 }, label: 'destination tenant name', disallowedGlobalUnique: ['name'] },
  { collection: 'categories', key: { tenantId: 1, slug: 1 }, label: 'category tenant slug', disallowedGlobalUnique: ['slug'] },
  { collection: 'categories', key: { tenantId: 1, name: 1 }, label: 'category tenant name', disallowedGlobalUnique: ['name'] },
  { collection: 'tours', key: { tenantId: 1, slug: 1 }, label: 'tour tenant slug', disallowedGlobalUnique: ['slug'] },
  {
    collection: 'contentpublishreceipts',
    key: { idempotencyKey: 1, tenantId: 1, contentType: 1 },
    label: 'publish receipt key tenant type',
  },
];

function sameKey(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  if (!process.argv.includes('--dry-run')) {
    console.error('Refusing to run without --dry-run. This inspector has no apply mode.');
    process.exitCode = 2;
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required for read-only inspection');

  await mongoose.connect(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
    readPreference: 'secondaryPreferred',
  });
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection did not expose a database');

  const report: Array<Record<string, unknown>> = [];
  for (const requirement of REQUIREMENTS) {
    const collection = database.collection(requirement.collection);
    let indexes: Array<{ name?: string; key?: Record<string, unknown>; unique?: boolean }> = [];
    try {
      indexes = await collection.indexes();
    } catch (error) {
      const codeName = error && typeof error === 'object'
        ? (error as { codeName?: string }).codeName
        : undefined;
      if (codeName !== 'NamespaceNotFound') throw error;
    }

    const required = indexes.find((index) => index.unique === true && sameKey(index.key ?? {}, requirement.key));
    const conflicting = indexes.filter((index) =>
      index.unique === true &&
      Object.keys(index.key ?? {}).length === 1 &&
      requirement.disallowedGlobalUnique?.includes(Object.keys(index.key ?? {})[0]));
    const idFields = Object.keys(requirement.key);
    const duplicateGroups = indexes.length === 0
      ? []
      : await collection.aggregate([
          { $group: { _id: Object.fromEntries(idFields.map((field) => [field, `$${field}`])), count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ], { allowDiskUse: false }).toArray();

    report.push({
      collection: requirement.collection,
      requirement: requirement.label,
      requiredUniquePresent: Boolean(required),
      requiredKey: requirement.key,
      conflictingGlobalUniqueIndexes: conflicting.map((index) => ({ name: index.name, key: index.key })),
      duplicateGroups,
    });
  }

  console.log(JSON.stringify({ mode: 'dry-run-read-only', report }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
