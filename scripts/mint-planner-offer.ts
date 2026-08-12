/**
 * Mint a personalised planner offer link.
 *
 * The link only names WHO the offer is for and WHICH tenant discount code to
 * apply — the code's value lives in the tenant's Discount collection, so a link
 * can never advertise a rate checkout would refuse. Create the code in
 * Admin → Discounts first; this script refuses to mint a link for a code that
 * is missing, inactive, expired or used up.
 *
 * Usage:
 *   OFFER_TOKEN_SECRET=… MONGODB_URI=… \
 *   npx tsx scripts/mint-planner-offer.ts <FirstName> <CODE> <hoursValid> <tenantId> [origin] [locale]
 *
 * The printed URL carries the locale prefix (default `en`) because nested paths
 * are only served in their locale-prefixed form on this platform.
 */
import mongoose from 'mongoose';
import { offerSlugFor, signOffer } from '../lib/offerToken';
import Discount from '../lib/models/Discount';
import PlannerOfferModel from '../lib/models/PlannerOffer';

async function main() {
  const [firstName, code, hoursRaw, tenantId, origin, locale = 'en'] = process.argv.slice(2);
  if (!firstName || !code || !hoursRaw || !tenantId) {
    console.error('Usage: mint-planner-offer.ts <FirstName> <CODE> <hoursValid> <tenantId> [origin]');
    process.exit(1);
  }
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours <= 0) {
    console.error('hoursValid must be a positive number');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required so the code can be validated before minting');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const record: any = await Discount.findOne({ tenantId, code: code.toUpperCase() }).lean();
    if (!record) {
      console.error(`No discount "${code.toUpperCase()}" exists for tenant "${tenantId}". Create it in Admin → Discounts first.`);
      process.exit(2);
    }
    const problems: string[] = [];
    if (!record.isActive) problems.push('it is inactive');
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) problems.push('it has expired');
    if (record.usageLimit && record.timesUsed >= record.usageLimit) problems.push('it has reached its usage limit');
    if (problems.length) {
      console.error(`Discount "${record.code}" cannot be offered: ${problems.join(', ')}.`);
      process.exit(2);
    }

    const expiresAt = new Date(Date.now() + hours * 3_600_000);
    const base = (origin || '').replace(/\/$/, '');
    const worth = record.discountType === 'percentage' ? `${record.value}%` : `$${record.value}`;

    // Short, shareable slug — retried on the rare collision with the unique index.
    let slug = '';
    for (let attempt = 0; attempt < 6 && !slug; attempt += 1) {
      const candidate = offerSlugFor(firstName);
      try {
        await PlannerOfferModel.create({
          tenantId,
          slug: candidate,
          firstName: firstName.trim(),
          discountCode: record.code,
          expiresAt,
          createdBy: 'mint-planner-offer',
        });
        slug = candidate;
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
    if (!slug) throw new Error('Could not allocate a unique offer slug — try again');

    console.log(`\nOffer for ${firstName} — ${record.code} (${worth}), valid ${hours}h (until ${expiresAt.toISOString()})`);
    const path = `/${locale}/offer/${slug}`;
    console.log(base ? `${base}${path}` : path);
    console.log('');
    // The signed token remains valid for the same offer if a link ever needs to
    // work without a database lookup.
    console.log(`(fallback signed link: ${base}/${locale}/offer/${signOffer({ firstName, discountCode: record.code, expiresAt: expiresAt.toISOString() })})`);
    console.log('');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
