import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import SpecialOffer from '../lib/models/SpecialOffer';
import Tour from '../lib/models/Tour';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const offers = await SpecialOffer.find({}).select('name type discountValue code minDaysInAdvance maxDaysBeforeTour applicableTours isActive').lean();
  
  console.log('\n📋 SPECIAL OFFERS IN DATABASE:\n');
  console.log('='.repeat(60));
  
  for (const offer of offers) {
    console.log(`\n📌 ${offer.name}`);
    console.log(`   Type: ${offer.type}`);
    console.log(`   Discount: ${offer.type === 'fixed' ? '$' : ''}${offer.discountValue}${offer.type !== 'fixed' ? '%' : ''}`);
    if (offer.code) console.log(`   Code: ${offer.code}`);
    if (offer.minDaysInAdvance && offer.type === 'early_bird') {
      console.log(`   Min Days In Advance: ${offer.minDaysInAdvance}`);
    }
    if (offer.maxDaysBeforeTour && offer.type === 'last_minute') {
      console.log(`   Max Days Before Tour: ${offer.maxDaysBeforeTour}`);
    }
    console.log(`   Active: ${offer.isActive ? 'Yes' : 'No'}`);
    
    if (offer.applicableTours?.length) {
      const tour = await Tour.findById(offer.applicableTours[0]).select('title slug').lean();
      if (tour) {
        console.log(`   Applied to: ${tour.title}`);
        console.log(`   Tour URL: /${tour.slug}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\nTotal: ${offers.length} offers found\n`);
  
  await mongoose.disconnect();
}

main().catch(console.error);
