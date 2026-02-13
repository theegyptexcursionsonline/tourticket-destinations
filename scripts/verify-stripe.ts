// scripts/verify-stripe.ts
// Run with: npx tsx scripts/verify-stripe.ts

import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.blue}${msg}${colors.reset}`),
};

async function verifyStripeConfiguration() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Stripe Integration Verification');
  console.log(`${'='.repeat(60)}\n`);

  let hasErrors = false;

  // 1. Check Environment Variables
  log.section('1. Checking Environment Variables');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const restrictedKey = process.env.STRIPE_RESTRICTED_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    log.error('STRIPE_SECRET_KEY is not set');
    hasErrors = true;
  } else if (secretKey.startsWith('sk_live_')) {
    log.warning('Using LIVE secret key - real charges will occur!');
  } else if (secretKey.startsWith('sk_test_')) {
    log.success('Using TEST secret key');
  } else {
    log.error('Invalid STRIPE_SECRET_KEY format');
    hasErrors = true;
  }

  if (!publishableKey) {
    log.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    hasErrors = true;
  } else if (publishableKey.startsWith('pk_live_')) {
    log.warning('Using LIVE publishable key');
  } else if (publishableKey.startsWith('pk_test_')) {
    log.success('Using TEST publishable key');
  } else {
    log.error('Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format');
    hasErrors = true;
  }

  if (restrictedKey) {
    log.success('Restricted key is set');
  } else {
    log.info('Restricted key is not set (optional)');
  }

  if (!webhookSecret) {
    log.warning('STRIPE_WEBHOOK_SECRET is not set - webhooks will not work');
    log.info('Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  } else {
    log.success('Webhook secret is set');
  }

  // Check key consistency
  const isSecretLive = secretKey?.startsWith('sk_live_');
  const isPublishableLive = publishableKey?.startsWith('pk_live_');

  if (isSecretLive !== isPublishableLive) {
    log.error('Key mismatch! Secret and Publishable keys must both be test or live');
    hasErrors = true;
  }

  // 2. Test Stripe API Connection
  if (secretKey && !hasErrors) {
    log.section('2. Testing Stripe API Connection');

    try {
      const stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia' as any,
      });

      // Test API call
      const account = await stripe.balance.retrieve();
      log.success('Successfully connected to Stripe API');

      // Check available balance
      const availableBalance = account.available.find(b => b.currency === 'usd');
      if (availableBalance) {
        const amount = (availableBalance.amount / 100).toFixed(2);
        log.info(`Available balance: $${amount} USD`);
      }

      // Test creating a small PaymentIntent
      log.info('Testing PaymentIntent creation...');
      const testIntent = await stripe.paymentIntents.create({
        amount: 100, // $1.00
        currency: 'usd',
        description: 'Test payment intent - verification script',
        metadata: {
          test: 'true',
          source: 'verify-stripe-script',
        },
      });

      log.success(`Created test PaymentIntent: ${testIntent.id}`);
      log.info('Status: ' + testIntent.status);

      // Cancel the test intent
      await stripe.paymentIntents.cancel(testIntent.id);
      log.success('Cancelled test PaymentIntent');

    } catch (error: any) {
      log.error('Failed to connect to Stripe API');
      log.error(`Error: ${error.message}`);
      hasErrors = true;

      if (error.type === 'StripeAuthenticationError') {
        log.error('Authentication failed - check your secret key');
      } else if (error.type === 'StripeAPIError') {
        log.error('Stripe API error - service might be down');
      }
    }
  }

  // 3. Check Required Files
  log.section('3. Checking Required Files');

  const requiredFiles = [
    'app/api/checkout/create-payment-intent/route.ts',
    'app/api/checkout/route.ts',
    'app/api/webhooks/stripe/route.ts',
    'lib/stripe.ts',
    'components/StripePaymentForm.tsx',
  ];

  const fs = await import('fs');
  for (const file of requiredFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log.success(`Found: ${file}`);
    } else {
      log.error(`Missing: ${file}`);
      hasErrors = true;
    }
  }

  // 4. Check Dependencies
  log.section('4. Checking Dependencies');

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );

    const requiredDeps = [
      'stripe',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
    ];

    for (const dep of requiredDeps) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        const version = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
        log.success(`${dep} ${version}`);
      } else {
        log.error(`Missing dependency: ${dep}`);
        hasErrors = true;
      }
    }
  } catch (error) {
    log.error('Failed to read package.json');
    hasErrors = true;
  }

  // 5. Summary
  log.section('Summary');

  if (!hasErrors) {
    log.success('All checks passed! Stripe integration is ready to use.');

    if (secretKey?.startsWith('sk_live_')) {
      log.warning('\n⚠️  IMPORTANT: You are using LIVE keys!');
      log.warning('Real credit cards will be charged.');
      log.warning('For testing, switch to test keys:');
      log.info('1. Go to Stripe Dashboard → Developers → API keys');
      log.info('2. Toggle to "Test mode"');
      log.info('3. Replace keys in .env with test keys');
      log.info('4. Restart your server');
    } else {
      log.success('\nYou are using TEST mode - safe for testing!');
      log.info('\nTest card numbers:');
      log.info('  Success: 4242 4242 4242 4242');
      log.info('  Decline: 4000 0000 0000 0002');
      log.info('  3D Secure: 4000 0027 6000 3184');
    }

    log.info('\nNext steps:');
    log.info('1. Start dev server: npm run dev');
    log.info('2. Navigate to checkout page');
    log.info('3. Test payment flow');
    log.info('4. Check Stripe Dashboard for transactions');

    if (!webhookSecret) {
      log.info('\nOptional - Set up webhooks:');
      log.info('stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    }

    console.log(`\n${'='.repeat(60)}\n`);
    process.exit(0);
  } else {
    log.error('\nSome checks failed. Please fix the errors above.');
    console.log(`\n${'='.repeat(60)}\n`);
    process.exit(1);
  }
}

// Run verification
verifyStripeConfiguration().catch((error) => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
