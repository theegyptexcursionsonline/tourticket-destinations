// scripts/update-tenant-logos.ts
// Quick script to update tenant logos in the database to use local image files
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TENANT_IDS = [
  'hurghada-excursions-online',
  'cairo-excursions-online',
  'makadi-bay',
  'el-gouna',
  'luxor-excursions',
  'sharm-excursions-online',
  'aswan-excursions',
  'marsa-alam-excursions',
  'dahab-excursions',
];

const UPDATES = TENANT_IDS.map(id => ({
  tenantId: id,
  logo: `/tenants/${id}/logo.png`,
  favicon: `/tenants/${id}/favicon.ico`,
}));

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const db = mongoose.connection.db!;
  const collection = db.collection('tenants');

  for (const { tenantId, logo, favicon } of UPDATES) {
    const result = await collection.updateOne(
      { tenantId, isActive: true },
      { $set: { 'branding.logo': logo, 'branding.logoDark': logo, 'branding.favicon': favicon } }
    );
    console.log(`${tenantId}: ${result.modifiedCount > 0 ? 'Updated' : 'No change (not found or already set)'}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
