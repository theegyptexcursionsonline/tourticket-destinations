#!/usr/bin/env npx tsx
// scripts/assign-tours-to-excursions-tenants.ts
// Script to assign all existing tours to the new excursions tenants
// This allows each tenant site to display tours immediately

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Define schemas inline to avoid import issues
const TourSchema = new mongoose.Schema({
  title: String,
  slug: String,
  tenantId: String,
  isPublished: Boolean,
  isFeatured: Boolean,
}, { strict: false });

const TenantSchema = new mongoose.Schema({
  tenantId: String,
  name: String,
  isActive: Boolean,
}, { strict: false });

const Tour = mongoose.models.Tour || mongoose.model('Tour', TourSchema);
const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);

// New tenant IDs
const NEW_TENANT_IDS = [
  'hurghada-excursions-online',
  'cairo-excursions-online',
  'makadi-bay',
  'el-gouna',
  'luxor-excursions',
  'sharm-excursions-online',
];

// Mapping of tenant to relevant keywords for auto-assignment
const TENANT_KEYWORDS: Record<string, string[]> = {
  'hurghada-excursions-online': [
    'hurghada', 'red sea', 'snorkeling', 'diving', 'dolphin', 'island',
    'boat', 'giftun', 'orange bay', 'parasailing', 'jet ski', 'fishing',
    'submarine', 'glass boat', 'yacht', 'safari', 'desert', 'quad',
    'luxor from hurghada', 'cairo from hurghada'
  ],
  'cairo-excursions-online': [
    'cairo', 'pyramid', 'giza', 'sphinx', 'museum', 'egyptian museum',
    'khan khalili', 'old cairo', 'coptic', 'citadel', 'mohamed ali',
    'alexandria', 'luxor from cairo', 'aswan from cairo'
  ],
  'makadi-bay': [
    'makadi', 'hurghada', 'red sea', 'snorkeling', 'diving', 'desert safari',
    'quad', 'luxor', 'boat', 'dolphin', 'island'
  ],
  'el-gouna': [
    'el gouna', 'elgouna', 'hurghada', 'kitesurfing', 'kite', 'diving',
    'snorkeling', 'yacht', 'boat', 'marina', 'golf'
  ],
  'luxor-excursions': [
    'luxor', 'valley of the kings', 'karnak', 'hatshepsut', 'temple',
    'colossi', 'memnon', 'nile', 'felucca', 'hot air balloon', 'aswan',
    'abu simbel', 'edfu', 'kom ombo'
  ],
  'sharm-excursions-online': [
    'sharm', 'sharm el sheikh', 'ras mohammed', 'tiran', 'blue hole',
    'dahab', 'diving', 'snorkeling', 'desert safari', 'quad', 'camel',
    'bedouin', 'st catherine', 'moses mountain', 'sinai'
  ],
};

async function assignToursToTenants() {
  console.log('🚀 Starting Tour Assignment to Excursions Tenants');
  console.log('=' .repeat(60));

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all published tours
    const allTours = await Tour.find({ isPublished: true })
      .select('_id title slug tenantId tags description')
      .lean();

    console.log(`📊 Found ${allTours.length} published tours\n`);

    // Verify new tenants exist
    console.log('📋 Verifying tenants exist...');
    for (const tenantId of NEW_TENANT_IDS) {
      const tenant = await Tenant.findOne({ tenantId, isActive: true }).lean();
      if (tenant) {
        console.log(`   ✅ ${tenantId}`);
      } else {
        console.log(`   ❌ ${tenantId} - NOT FOUND OR INACTIVE`);
      }
    }
    console.log('');

    // Assign tours based on keywords
    console.log('🎯 Assigning tours to tenants based on keywords...\n');

    for (const tenantId of NEW_TENANT_IDS) {
      const keywords = TENANT_KEYWORDS[tenantId] || [];
      const keywordRegex = keywords.map(k => new RegExp(k, 'i'));

      // Find matching tours
      const matchingTours = allTours.filter(tour => {
        const titleMatch = keywordRegex.some(regex => regex.test(tour.title || ''));
        const tagsMatch = tour.tags && keywordRegex.some(regex => 
          tour.tags.some((tag: string) => regex.test(tag))
        );
        const descMatch = keywordRegex.some(regex => regex.test(tour.description || ''));
        return titleMatch || tagsMatch || descMatch;
      });

      console.log(`   📌 ${tenantId}: Found ${matchingTours.length} matching tours`);

      if (matchingTours.length > 0) {
        // Update tours with tenant ID (create copies with new tenantId)
        // For now, we'll just report what would be assigned
        const tourIds = matchingTours.map(t => t._id);
        
        // Actually update the tours (assign to tenant)
        const result = await Tour.updateMany(
          { 
            _id: { $in: tourIds },
            // Only update tours that don't have a specific tenant or are 'default'
            $or: [
              { tenantId: { $exists: false } },
              { tenantId: null },
              { tenantId: '' },
              { tenantId: 'default' }
            ]
          },
          { $set: { tenantId: tenantId } }
        );

        console.log(`      → Updated ${result.modifiedCount} tours to ${tenantId}`);
        
        // List first 5 matching tours
        matchingTours.slice(0, 5).forEach(tour => {
          console.log(`         • ${tour.title}`);
        });
        if (matchingTours.length > 5) {
          console.log(`         ... and ${matchingTours.length - 5} more`);
        }
      }
      console.log('');
    }

    // Alternative approach: Copy ALL tours to each tenant
    // This is more aggressive but ensures each tenant has content
    console.log('=' .repeat(60));
    console.log('📋 ALTERNATIVE: Assign ALL tours to tenants without existing tours...\n');

    for (const tenantId of NEW_TENANT_IDS) {
      // Check if tenant already has tours
      const existingCount = await Tour.countDocuments({ tenantId });
      
      if (existingCount === 0) {
        console.log(`   ${tenantId}: No tours yet. You can assign tours from admin panel.`);
        console.log(`      → Go to Admin > Tours > Select tours > Assign to Tenant`);
      } else {
        console.log(`   ${tenantId}: Has ${existingCount} tours`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ASSIGNMENT COMPLETE!\n');
    console.log('📝 To manually assign more tours:');
    console.log('   1. Go to Admin Panel > Tours');
    console.log('   2. Select tours you want to assign');
    console.log('   3. Use "Assign to Tenant" button');
    console.log('   4. Select the target tenant\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

// Run the script
assignToursToTenants();
