#!/usr/bin/env tsx
/**
 * Database Migration: Initialize translations subdocument on Tour documents
 *
 * This script adds an empty `translations` object to all Tour documents
 * that don't already have one. This is a non-destructive migration that
 * can be run multiple times safely.
 *
 * Usage: npx tsx scripts/migrate-translatable-fields.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('❌ Database connection not available');
    process.exit(1);
  }

  // Migrate Tours collection
  console.log('\n📦 Migrating Tours collection...');
  const toursCollection = db.collection('tours');

  const toursWithoutTranslations = await toursCollection.countDocuments({
    translations: { $exists: false },
  });

  if (toursWithoutTranslations > 0) {
    const result = await toursCollection.updateMany(
      { translations: { $exists: false } },
      { $set: { translations: {} } }
    );
    console.log(`   Updated ${result.modifiedCount} tours with empty translations field`);
  } else {
    console.log('   All tours already have translations field');
  }

  // Migrate Destinations collection
  console.log('\n📦 Migrating Destinations collection...');
  const destinationsCollection = db.collection('destinations');

  const destsWithoutTranslations = await destinationsCollection.countDocuments({
    translations: { $exists: false },
  });

  if (destsWithoutTranslations > 0) {
    const result = await destinationsCollection.updateMany(
      { translations: { $exists: false } },
      { $set: { translations: {} } }
    );
    console.log(`   Updated ${result.modifiedCount} destinations with empty translations field`);
  } else {
    console.log('   All destinations already have translations field');
  }

  // Migrate Categories collection
  console.log('\n📦 Migrating Categories collection...');
  const categoriesCollection = db.collection('categories');

  const catsWithoutTranslations = await categoriesCollection.countDocuments({
    translations: { $exists: false },
  });

  if (catsWithoutTranslations > 0) {
    const result = await categoriesCollection.updateMany(
      { translations: { $exists: false } },
      { $set: { translations: {} } }
    );
    console.log(`   Updated ${result.modifiedCount} categories with empty translations field`);
  } else {
    console.log('   All categories already have translations field');
  }

  // Summary
  const totalTours = await toursCollection.countDocuments();
  const totalDests = await destinationsCollection.countDocuments();
  const totalCats = await categoriesCollection.countDocuments();

  console.log('\n📊 Summary:');
  console.log(`   Tours: ${totalTours} total, all have translations field`);
  console.log(`   Destinations: ${totalDests} total, all have translations field`);
  console.log(`   Categories: ${totalCats} total, all have translations field`);
  console.log('\n✅ Migration complete!');

  await mongoose.disconnect();
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
