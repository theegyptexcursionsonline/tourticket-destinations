/** Freeze a read-only repair plan, then apply or roll back that exact plan explicitly. */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import {
  planBookingOptionKeyRepair, bookingOptionKeyRepairState, bookingOptionKeyRepairUpdate,
  validateBookingOptionKeyRepair, type OptionKeyRepair,
} from '../lib/revenue/bookingOptionKeyRepair';

const args = process.argv.slice(2);
const values = (flag: string) => args.flatMap((value, index) => value === flag && args[index + 1] ? [args[index + 1]] : []);
const value = (flag: string) => values(flag)[0];
type Plan = { version: 1; databaseIdentity: string; tenantIds: string[]; createdAt: string; repairs: OptionKeyRepair[] };

async function run() {
  const apply = value('--apply');
  const rollback = value('--rollback');
  if (apply && rollback) throw new Error('Choose apply or rollback');
  if (rollback && !args.includes('--confirm-writers-paused')) throw new Error('Rollback requires all booking, cart, admin, and pricing writers paused and verified; use --confirm-writers-paused only after that operational gate');
  const tenantIds = [...new Set(values('--tenant-id'))];
  const output = value('--output');
  if (!apply && !rollback && (!output || !tenantIds.length)) throw new Error('Read-only planning requires --tenant-id (repeatable) and --output');
  if (!process.env.MONGODB_URI) throw new Error('Scoped database configuration is required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db!;
  const connectionOptions = mongoose.connection.getClient().options;
  const cluster = connectionOptions.srvHost || connectionOptions.hosts.map(String).sort().join(',');
  const databaseIdentity = createHash('sha256').update(`${cluster}:${mongoose.connection.name}`).digest('hex');
  const tours = db.collection('tours');
  if (apply || rollback) {
    const plan = mongoose.mongo.BSON.EJSON.parse(readFileSync((apply || rollback)!, 'utf8')) as Plan;
    if (plan.version !== 1 || plan.databaseIdentity !== databaseIdentity || value('--confirm-db-hash') !== databaseIdentity) throw new Error('Database confirmation does not match the frozen plan');
    if (!plan.tenantIds.length || new Set(plan.repairs.map(p => p.tourId)).size !== plan.repairs.length) throw new Error('Invalid repair scope');
    // Validate every entry before the first write. The file is the rollback snapshot.
    for (const repair of plan.repairs) {
      if (!plan.tenantIds.includes(repair.tenantId)) throw new Error('Repair outside tenant allowlist');
      validateBookingOptionKeyRepair(repair);
    }
    let updated = 0; let replayed = 0;
    for (const repair of plan.repairs) {
      const target = { _id: new mongoose.Types.ObjectId(repair.tourId), tenantId: repair.tenantId };
      const current = await tours.findOne(target, { projection: { bookingOptions: 1 } });
      if (!current) throw new Error(`Repair target unavailable: ${repair.tourId}`);
      if (bookingOptionKeyRepairState(repair, current.bookingOptions, Boolean(rollback)) === 'already-applied') { replayed++; continue; }
      if (rollback) {
        const newKeys = repair.after.filter((option, index) => !repair.before[index].pricingKey).map(option => option.pricingKey);
        // Never remove identifiers now used by paid/booked records or dynamic prices.
        const dependent = await Promise.all([
          db.collection('bookings').findOne({ tour: target._id, 'selectedBookingOption.pricingKey': { $in: newKeys } }, { projection: { _id: 1 } }),
          db.collection('users').findOne({ cart: { $elemMatch: { tourId: target._id, 'selectedBookingOption.pricingKey': { $in: newKeys } } } }, { projection: { _id: 1 } }),
          db.collection('revenuepriceoverrides').findOne({ tourId: target._id, optionKey: { $in: newKeys } }, { projection: { _id: 1 } }),
        ]);
        if (dependent.some(Boolean)) throw new Error(`Rollback has dependent records: ${repair.tourId}`);
      }
      const result = await tours.updateOne({ ...target, bookingOptions: rollback ? repair.after : repair.before }, bookingOptionKeyRepairUpdate(repair, Boolean(rollback)));
      if (result.matchedCount !== 1) throw new Error(`Concurrent option edit; repair stopped: ${repair.tourId}`);
      const verified = await tours.findOne(target, { projection: { bookingOptions: 1 } });
      if (!verified || bookingOptionKeyRepairState(repair, verified.bookingOptions, Boolean(rollback)) !== 'already-applied') throw new Error(`Repair readback failed: ${repair.tourId}`);
      updated++;
    }
    console.log(JSON.stringify({ mode: rollback ? 'rolled-back' : 'applied', updated, replayed }));
    return;
  }
  if (tenantIds.some(id => !/^[a-z0-9][a-z0-9-]{0,62}$/.test(id))) throw new Error('Invalid tenant allowlist');
  const active = await db.collection('tenants').find({ tenantId: { $in: tenantIds }, isActive: { $ne: false } }, { projection: { tenantId: 1 } }).toArray();
  if (tenantIds.some(id => !active.some(tenant => tenant.tenantId === id))) throw new Error('Tenant allowlist includes an unavailable tenant');
  const tourIds = values('--tour-id');
  if (tourIds.some(id => !/^[a-f0-9]{24}$/i.test(id))) throw new Error('Invalid tour allowlist');
  const query = { tenantId: { $in: tenantIds }, isPublished: true, archivedAt: null, 'bookingOptions.0': { $exists: true }, ...(tourIds.length ? { _id: { $in: tourIds.map(id => new mongoose.Types.ObjectId(id)) } } : {}) };
  const plan: Plan = { version: 1, databaseIdentity, tenantIds, createdAt: new Date().toISOString(), repairs: [] };
  let scanned = 0;
  const blocked: Array<{ tourId: string; reason: string }> = [];
  // Cursor includes the tail without retaining the entire catalogue in memory.
  for await (const tour of tours.find(query, { projection: { _id: 1, tenantId: 1, bookingOptions: 1, addOns: 1 } })) {
    scanned++;
    try {
      const repair = planBookingOptionKeyRepair(String(tour._id), tour.tenantId, tour.bookingOptions);
      if (!repair) continue;
      // Identity-only migration cannot silently reinterpret restricted add-ons.
      const newKeys = new Set(repair.after.map(option => option.pricingKey));
      if ((tour.addOns || []).some((addOn: { bookingOptionKeys?: string[] }) => (addOn.bookingOptionKeys || []).some(key => !newKeys.has(key)))) throw new Error('Legacy add-on assignments require a separately reviewed mapping');
      plan.repairs.push(repair);
    } catch (error) { blocked.push({ tourId: String(tour._id), reason: error instanceof Error ? error.message : 'Invalid repair' }); }
  }
  if (blocked.length) {
    console.log(JSON.stringify({ mode: 'dry-run-blocked', scanned, blocked }));
    throw new Error('No executable plan written because some targets require review');
  }
  // Exclusive creation prevents overwriting a snapshot after any partial apply.
  writeFileSync(output!, mongoose.mongo.BSON.EJSON.stringify(plan, { relaxed: false }), { flag: 'wx', mode: 0o600 });
  const counts = Object.fromEntries(tenantIds.map(tenantId => [tenantId, plan.repairs.filter(repair => repair.tenantId === tenantId).length]));
  console.log(JSON.stringify({ mode: 'dry-run', scanned, repairs: plan.repairs.length, counts, databaseIdentity, addedIds: plan.repairs.reduce((sum, p) => sum + p.before.filter(o => !o.id).length, 0), addedKeys: plan.repairs.reduce((sum, p) => sum + p.before.filter(o => !o.pricingKey).length, 0) }));
}
run().catch((error) => { console.error(error instanceof Error ? error.message : 'Repair failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
