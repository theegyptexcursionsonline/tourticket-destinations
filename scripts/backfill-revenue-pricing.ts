import 'dotenv/config';
import dbConnect from '../lib/dbConnect';
import { backfillRevenuePricing } from '../lib/revenue/pricingBackfill';

function requestedTourIds() {
  const fromArguments = process.argv.flatMap((argument, index, all) => argument === '--tour-id' && all[index + 1] ? [all[index + 1]] : []);
  const fromEnvironment = (process.env.REVENUE_PRICING_TOUR_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set([...fromArguments, ...fromEnvironment])];
}

function requestedTenantId() {
  const argumentIndex = process.argv.indexOf('--tenant-id');
  return (argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined)
    || process.env.REVENUE_PRICING_TENANT_ID
    || '';
}

async function run() {
  if (process.argv.includes('--apply') && process.argv.includes('--dry-run')) {
    throw new Error('Choose either --dry-run or --apply, not both.');
  }
  // Data migration is non-mutating unless the operator opts in explicitly.
  const dryRun = !process.argv.includes('--apply');
  const materializeGuestPrices = process.argv.includes('--materialize-guest-prices');
  const tourIds = requestedTourIds();
  const tenantId = requestedTenantId().trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) {
    throw new Error('A valid --tenant-id or REVENUE_PRICING_TENANT_ID is required.');
  }
  if (materializeGuestPrices && tourIds.length === 0) {
    throw new Error('Guest-price materialization requires at least one explicit --tour-id or REVENUE_PRICING_TOUR_IDS value.');
  }
  await dbConnect();
  console.log(JSON.stringify(await backfillRevenuePricing(dryRun, { tenantId, tourIds, materializeGuestPrices })));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
