// scripts/update-tenant-logos.ts
// Quick script to update tenant logos in the database to use local image files
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const LOGO_UPDATES = [
  { tenantId: 'hurghada-excursions-online', logo: '/tenants/hurghada-excursions-online/logo.png' },
  { tenantId: 'cairo-excursions-online', logo: '/tenants/cairo-excursions-online/logo.png' },
  { tenantId: 'makadi-bay', logo: '/tenants/makadi-bay/logo.png' },
  { tenantId: 'el-gouna', logo: '/tenants/el-gouna/logo.png' },
  { tenantId: 'luxor-excursions', logo: '/tenants/luxor-excursions/logo.png' },
  { tenantId: 'sharm-excursions-online', logo: '/tenants/sharm-excursions-online/logo.png' },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const db = mongoose.connection.db!;
  const collection = db.collection('tenants');

  for (const { tenantId, logo } of LOGO_UPDATES) {
    const result = await collection.updateOne(
      { tenantId, isActive: true },
      { $set: { 'branding.logo': logo, 'branding.logoDark': logo } }
    );
    console.log(`${tenantId}: ${result.modifiedCount > 0 ? 'Updated' : 'No change (not found or already set)'}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
