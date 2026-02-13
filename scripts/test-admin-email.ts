// scripts/test-admin-email.ts
// Quick test for Admin Booking Alert with detailed tour information
// Run with: npx tsx scripts/test-admin-email.ts

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Override admin email for testing
process.env.ADMIN_NOTIFICATION_EMAIL = 'info@rdmi.in';

async function testAdminEmail() {
  // Dynamic import so env vars are loaded first
  const { EmailService } = await import('../lib/email/emailService');

  console.log('🚀 Testing Admin Booking Alert...\n');
  console.log('📧 Mailgun Config:');
  console.log(`   DOMAIN: ${process.env.MAILGUN_DOMAIN}`);
  console.log(`   FROM_EMAIL: ${process.env.MAILGUN_FROM_EMAIL}`);
  console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_NOTIFICATION_EMAIL}`);
  console.log(`   CC_EMAIL: ${process.env.ADMIN_NOTIFICATION_CC_EMAIL}`);
  console.log(`   API_KEY: ${process.env.MAILGUN_API_KEY?.substring(0, 10)}...`);
  console.log('');

  try {
    await EmailService.sendAdminBookingAlert({
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+20 11 42255624',
      tourTitle: 'Luxor Day Trip from Makadi Bay',
      bookingId: 'TEST-' + Date.now(),
      bookingDate: 'Saturday, February 15, 2026',
      totalPrice: '$85.00',
      paymentMethod: 'card',
      specialRequests: 'Please arrange early morning pickup.',
      adminDashboardLink: 'https://dashboard.egypt-excursionsonline.com/admin/bookings/test',
      baseUrl: 'https://egypt-excursionsonline.com',
      tours: [
        {
          title: 'Luxor Day Trip from Makadi Bay',
          date: 'Sat, Feb 15, 2026',
          time: '06:00 AM',
          adults: 2,
          children: 1,
          infants: 0,
          bookingOption: 'Private Tour',
          price: '$85.00'
        }
      ]
    });

    console.log('\n✅ Admin Booking Alert sent successfully!');
    console.log(`📬 Check inbox at: ${process.env.ADMIN_NOTIFICATION_EMAIL}`);
  } catch (error) {
    console.error('\n❌ Failed to send email:', error);
    process.exit(1);
  }
}

testAdminEmail()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
