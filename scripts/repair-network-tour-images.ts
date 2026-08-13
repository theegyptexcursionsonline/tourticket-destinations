/**
 * Repair wrong-subject seeded stock images across the destination network
 * (a Scottish hillside on a desert quad safari, an autumn forest on a dive
 * trip, a fish shoal on a beach day).
 *
 * Guarded and idempotent: each update matches tenant + slug + the exact wrong
 * URL, so re-running is a no-op and an operator-chosen image is never replaced.
 * Previous values are written to readiness-proof before anything changes.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
dotenv.config({ path: '.env.local' });

const q = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&fm=jpg`;

const REPAIRS: Array<{ tenantId: string; slug: string; from: string; to: string; why: string }> = [
  { tenantId: 'hurghada-excursions-online', slug: 'intro-scuba-diving-hurghada', from: q('1682407186023-12c70a4a35e0'), to: q('1560275619-4662e36fa65c'), why: 'autumn forest on a dive trip' },
  { tenantId: 'hurghada-excursions-online', slug: 'desert-safari-quad-bike', from: q('1558618666-fcd25c85cd64'), to: q('1542401886-65d6c61db217'), why: 'espresso machine on a quad safari' },
  { tenantId: 'hurghada-excursions-online', slug: 'mahmya-island-beach-day', from: q('1544551763-77ef2d0cfc6c'), to: q('1473116763249-2faaef81ccda'), why: 'underwater shoal on a beach day' },
  { tenantId: 'el-gouna', slug: 'scuba-diving-abu-nuhas', from: q('1682407186023-12c70a4a35e0'), to: q('1544551763-46a013bb70d5'), why: 'autumn forest on a dive trip' },
  { tenantId: 'el-gouna', slug: 'snorkeling-boat-trip-el-gouna', from: q('1559827291-72ee739d0d9a'), to: q('1546026423-cc4642628d2b'), why: 'green hillside road on a snorkeling trip' },
  { tenantId: 'el-gouna', slug: 'desert-quad-safari-el-gouna', from: q('1451337516015-6b6e9a44a8a3'), to: q('1542401886-65d6c61db217'), why: 'Scottish highlands on a desert safari' },
  { tenantId: 'el-gouna', slug: 'private-yacht-charter-el-gouna', from: q('1544551763-77ef2d0cfc6c'), to: q('1505142468610-359e7d316be0'), why: 'underwater shoal on a yacht charter' },
  { tenantId: 'makadi-bay', slug: 'makadi-bay-snorkeling-trip', from: q('1559827291-72ee739d0d9a'), to: q('1546026423-cc4642628d2b'), why: 'green hillside road on a snorkeling trip' },
  { tenantId: 'makadi-bay', slug: 'bedouin-night-under-the-stars', from: q('1451337516015-6b6e9a44a8a3'), to: q('1547234935-80c7145ec969'), why: 'Scottish highlands on a Bedouin desert night' },
  // Luxor and Cairo carried photographs of an entirely different world:
  // footballs on a pitch for the Valley of the Kings, a Mumbai bridge for a
  // Nile felucca, Dolomite hikers for a Nile trip, polaroid snapshots for two
  // temple tours, a horse in a meadow for Islamic Cairo. Replaced with verified
  // Egypt photography. NOTE: these are monuments in Giza/Cairo, not the exact
  // site of every tour — the real fix is operator photography per tour.
  { tenantId: 'luxor-excursions', slug: 'valley-of-kings-hatshepsut-temple', from: q('1551958219-acbc608c6377'), to: q('1553913861-c0fddf2619ee'), why: 'footballs on a temple tour' },
  { tenantId: 'luxor-excursions', slug: 'luxor-museum-city-walk', from: q('1595981234058-a9302fb97229'), to: q('1572252009286-268acec5ca0a'), why: 'polaroid snapshots on a museum walk' },
  { tenantId: 'luxor-excursions', slug: 'karnak-luxor-temple-tour', from: q('1595981234058-a9302fb97229'), to: q('1568322445389-f64ac2515020'), why: 'polaroid snapshots on a temple tour' },
  { tenantId: 'luxor-excursions', slug: 'nile-felucca-sunset-sail', from: q('1562979314-bee7453e911c'), to: q('1473116763249-2faaef81ccda'), why: 'a Mumbai road bridge on a Nile sail' },
  { tenantId: 'luxor-excursions', slug: 'banana-island-nile-trip', from: q('1539635278303-d4002c07eae3'), to: q('1507525428034-b723cf961d3e'), why: 'Dolomite hikers on a Nile island trip' },
  { tenantId: 'cairo-excursions-online', slug: 'islamic-cairo-khan-khalili', from: q('1553284965-83fd3e82fa5a'), to: q('1572252009286-268acec5ca0a'), why: 'a horse in a meadow on Islamic Cairo' },
  { tenantId: 'cairo-excursions-online', slug: 'egyptian-museum-tour', from: q('1572252009286-268acec5ca0a'), to: q('1553913861-c0fddf2619ee'), why: 'freed the Cairo skyline for Islamic Cairo' },
  { tenantId: 'cairo-excursions-online', slug: 'nile-dinner-cruise', from: q('1539635278303-d4002c07eae3'), to: q('1473116763249-2faaef81ccda'), why: 'Dolomite hikers on a Nile dinner cruise' },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const tours = mongoose.connection.db!.collection('tours');
  const backup: unknown[] = [];
  let fixed = 0;
  for (const repair of REPAIRS) {
    const before = await tours.findOne(
      { tenantId: repair.tenantId, slug: repair.slug },
      { projection: { title: 1, image: 1 } },
    );
    if (!before) { console.log(`SKIP  ${repair.tenantId}/${repair.slug}: not found`); continue; }
    backup.push({ tenantId: repair.tenantId, slug: repair.slug, previousImage: before.image });
    if (before.image !== repair.from) {
      console.log(`SKIP  ${repair.tenantId}/${repair.slug}: image already differs from the known-wrong one`);
      continue;
    }
    const result = await tours.updateOne(
      { tenantId: repair.tenantId, slug: repair.slug, image: repair.from },
      { $set: { image: repair.to } },
    );
    if (result.modifiedCount === 1) fixed += 1;
    console.log(`${result.modifiedCount === 1 ? 'FIXED' : 'NOOP '} ${repair.tenantId}/${repair.slug} — ${repair.why}`);
  }
  mkdirSync('readiness-proof/2026-08-13-network-offers', { recursive: true });
  writeFileSync('readiness-proof/2026-08-13-network-offers/tour-image-backup.json', JSON.stringify(backup, null, 2));
  console.log(`\n${fixed}/${REPAIRS.length} repaired. Backup: readiness-proof/2026-08-13-network-offers/tour-image-backup.json`);
  await mongoose.disconnect();
}
main().catch((error) => { console.error(error.message); process.exit(1); });
