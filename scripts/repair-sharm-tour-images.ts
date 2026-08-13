/**
 * Repair wrong-subject stock images on the sharm-excursions-online tenant's
 * seeded tours (a Paris museum on the Bedouin dinner, an espresso machine on
 * the quad safari, an autumn forest on the glass-bottom boat).
 *
 * Guarded and idempotent: each update matches tenant + slug + the exact wrong
 * URL, so re-running is a no-op and an admin-changed image is never clobbered.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
dotenv.config({ path: '.env.local' });

const TENANT = 'sharm-excursions-online';
const REPAIRS = [
  {
    slug: 'sharm-glass-bottom-boat',
    from: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1200&q=80&fm=jpg',
    to: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1200&q=80&fm=jpg', // coral reef seen through the glass
  },
  {
    slug: 'bedouin-dinner-desert',
    from: 'https://images.unsplash.com/photo-1542044896530-05d85be9b11a?w=1200&q=80&fm=jpg',
    to: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80&fm=jpg', // rocky Sinai-style desert
  },
  {
    slug: 'white-island-ras-mohammed',
    from: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1200&q=80&fm=jpg',
    to: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80&fm=jpg', // white sandbank meeting reef water
  },
  {
    slug: 'sharm-desert-safari-quad',
    from: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&fm=jpg',
    to: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1200&q=80&fm=jpg', // open dunes
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const tours = mongoose.connection.db!.collection('tours');
  const backup: unknown[] = [];
  for (const repair of REPAIRS) {
    const before = await tours.findOne(
      { tenantId: TENANT, slug: repair.slug },
      { projection: { title: 1, image: 1 } },
    );
    if (!before) { console.log(`SKIP ${repair.slug}: not found`); continue; }
    backup.push({ slug: repair.slug, previousImage: before.image });
    if (before.image !== repair.from) {
      console.log(`SKIP ${repair.slug}: image is not the known-wrong URL (left untouched)`);
      continue;
    }
    const result = await tours.updateOne(
      { tenantId: TENANT, slug: repair.slug, image: repair.from },
      { $set: { image: repair.to } },
    );
    console.log(`${result.modifiedCount === 1 ? 'FIXED' : 'NOOP '} ${repair.slug}: ${before.title}`);
  }
  writeFileSync('readiness-proof/2026-08-13-offer-10x/tour-image-backup.json', JSON.stringify(backup, null, 2));
  console.log('Backup written to readiness-proof/2026-08-13-offer-10x/tour-image-backup.json');
  await mongoose.disconnect();
}
main().catch((error) => { console.error(error.message); process.exit(1); });
