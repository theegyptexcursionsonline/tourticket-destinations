#!/usr/bin/env npx tsx
// scripts/cleanup-dummy-tenants.ts
// Removes all tenants that are NOT in the seeded list.
// Keeps: 9 Excursions Online + 1 Speedboat = 10 tenants

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const TENANTS_TO_KEEP = [
  'hurghada-excursions-online',
  'cairo-excursions-online',
  'makadi-bay',
  'el-gouna',
  'luxor-excursions',
  'sharm-excursions-online',
  'aswan-excursions',
  'marsa-alam-excursions',
  'dahab-excursions',
  'hurghada-speedboat',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    family: 4,
  });
  console.log('Connected to MongoDB\n');

  const Tenant = mongoose.connection.collection('tenants');

  // List all tenants
  const allTenants = await Tenant.find({}, { projection: { tenantId: 1, name: 1, isDefault: 1, domain: 1 } }).toArray();

  console.log(`Total tenants in DB: ${allTenants.length}\n`);

  const toKeep = allTenants.filter(t => TENANTS_TO_KEEP.includes(t.tenantId));
  const toRemove = allTenants.filter(t => !TENANTS_TO_KEEP.includes(t.tenantId));

  console.log('--- KEEPING ---');
  for (const t of toKeep) {
    console.log(`  ✅ ${t.tenantId} — ${t.name} (${t.domain})${t.isDefault ? ' [DEFAULT]' : ''}`);
  }

  console.log('\n--- REMOVING ---');
  if (toRemove.length === 0) {
    console.log('  Nothing to remove — all tenants are in the keep list.');
    await mongoose.disconnect();
    return;
  }
  for (const t of toRemove) {
    console.log(`  ❌ ${t.tenantId} — ${t.name} (${t.domain})${t.isDefault ? ' [DEFAULT]' : ''}`);
  }

  const removeIds = toRemove.map(t => t.tenantId);

  // If the current default tenant is being removed, promote the first kept tenant
  const currentDefault = allTenants.find(t => t.isDefault);
  if (currentDefault && removeIds.includes(currentDefault.tenantId)) {
    const newDefault = TENANTS_TO_KEEP[0]; // hurghada-excursions-online
    console.log(`\n⚠️  Default tenant "${currentDefault.tenantId}" is being removed.`);
    console.log(`   Promoting "${newDefault}" as new default.\n`);
    await Tenant.updateMany({}, { $set: { isDefault: false } });
    await Tenant.updateOne({ tenantId: newDefault }, { $set: { isDefault: true } });
  }

  // Delete the dummy tenants
  const result = await Tenant.deleteMany({ tenantId: { $in: removeIds } });
  console.log(`\n🗑️  Deleted ${result.deletedCount} dummy tenant(s).`);

  // Verify final state
  const remaining = await Tenant.find({}, { projection: { tenantId: 1, name: 1, isDefault: 1 } }).toArray();
  console.log(`\n📊 Final tenant count: ${remaining.length}`);
  for (const t of remaining) {
    console.log(`   ${t.isDefault ? '⭐' : '  '} ${t.tenantId} — ${t.name}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
