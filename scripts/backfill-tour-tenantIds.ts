// scripts/backfill-tour-tenantIds.ts
//
// One-time migration for Issue #17 (multi-brand tour assignment). Every legacy
// tour in the database has `tenantId: string` but no `tenantIds: string[]` —
// the new public query helpers match on both fields, so legacy tours already
// keep working, but the admin multi-brand UI reads `tenantIds` as the source
// of truth. This script backfills `tenantIds = [tenantId]` for every tour that
// doesn't have the new array yet.
//
// Usage:
//   pnpm tsx scripts/backfill-tour-tenantIds.ts           # live run
//   pnpm tsx scripts/backfill-tour-tenantIds.ts --dry     # dry run, no writes
//
// Safe to run multiple times — only tours missing `tenantIds` or with a
// divergent list are touched.

import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

const DRY_RUN = process.argv.includes('--dry');

async function main() {
  console.log(`[backfill-tour-tenantIds] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} starting...`);

  await dbConnect();

  // We want every tour regardless of published state because admin filtering
  // and future multi-brand assignment relies on the full collection being
  // consistent.
  const cursor = Tour.find({}, { _id: 1, tenantId: 1, tenantIds: 1 }).cursor();

  let scanned = 0;
  let toBackfill = 0;
  let updated = 0;
  const bulkOps: Array<{
    updateOne: { filter: { _id: mongoose.Types.ObjectId }; update: { $set: { tenantIds: string[] } } };
  }> = [];

  for await (const tour of cursor) {
    scanned += 1;
    const tenantId: string | undefined = (tour as any).tenantId;
    if (!tenantId) {
      console.warn(`  ! tour ${tour._id} has no tenantId — skipping`);
      continue;
    }

    const existing: string[] = Array.isArray((tour as any).tenantIds)
      ? ((tour as any).tenantIds as string[]).filter((x) => typeof x === 'string' && x.length > 0)
      : [];
    const target = Array.from(new Set([tenantId, ...existing]));

    const alreadyCorrect =
      existing.length === target.length && existing.every((id, i) => id === target[i]);
    if (alreadyCorrect) continue;

    toBackfill += 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: tour._id as mongoose.Types.ObjectId },
        update: { $set: { tenantIds: target } },
      },
    });

    if (bulkOps.length >= 500) {
      if (!DRY_RUN) {
        const res = await Tour.bulkWrite(bulkOps, { ordered: false });
        updated += res.modifiedCount ?? 0;
      }
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    if (!DRY_RUN) {
      const res = await Tour.bulkWrite(bulkOps, { ordered: false });
      updated += res.modifiedCount ?? 0;
    }
    bulkOps.length = 0;
  }

  console.log('');
  console.log(`  scanned:     ${scanned}`);
  console.log(`  to backfill: ${toBackfill}`);
  console.log(`  updated:     ${DRY_RUN ? '(dry run)' : updated}`);
  console.log('');

  await mongoose.disconnect();
  console.log('[backfill-tour-tenantIds] done');
}

main().catch((err) => {
  console.error('[backfill-tour-tenantIds] FAILED:', err);
  process.exit(1);
});
