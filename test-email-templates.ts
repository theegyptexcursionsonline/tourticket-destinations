// Test script for email templates
import { TemplateEngine } from './lib/email/templateEngine';
import type {
  BookingEmailData,
  PaymentEmailData,
  BookingStatusUpdateData,
} from './lib/email/type';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testEmailTemplates() {
  console.log('🧪 Testing Email Templates...\n');

  // Test 1: Booking Confirmation Email
  console.log('1️⃣ Testing Booking Confirmation Email');
  try {
    const bookingData: BookingEmailData = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      tourTitle: 'Pyramids of Giza Tour',
      bookingDate: 'Monday, January 15, 2024',
      bookingTime: '10:00 AM',
      participants: '2 participants',
      totalPrice: '$149.00',
      bookingId: 'EEO-12345678-ABC123',
      specialRequests: 'Vegetarian meals please',
      meetingPoint: 'Hotel Lobby',
      contactNumber: '+20 11 42255624',
      baseUrl: baseUrl,
    };

    const template = await TemplateEngine.loadTemplate('booking-confirmation');
    const html = TemplateEngine.replaceVariables(template, bookingData);

    // Check if critical variables are replaced
    if (html.includes('{{customerName}}')) {
      console.log('   ❌ FAIL: customerName not replaced');
    } else if (html.includes('{{baseUrl}}')) {
      console.log('   ❌ FAIL: baseUrl not replaced');
    } else if (!html.includes(bookingData.customerName)) {
      console.log('   ❌ FAIL: customerName not found in output');
    } else if (!html.includes(bookingData.bookingId)) {
      console.log('   ❌ FAIL: bookingId not found in output');
    } else {
      console.log('   ✅ PASS: All variables replaced correctly\n');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
  }

  // Test 2: Payment Confirmation Email
  console.log('2️⃣ Testing Payment Confirmation Email');
  try {
    const paymentData: PaymentEmailData = {
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      paymentId: 'pi_1234567890',
      paymentMethod: 'card',
      amount: '$149.00',
      currency: 'USD',
      bookingId: 'EEO-12345678-XYZ789',
      tourTitle: 'Nile River Cruise',
      baseUrl: baseUrl,
    };

    const template = await TemplateEngine.loadTemplate('payment-confirmation');
    const html = TemplateEngine.replaceVariables(template, paymentData);

    if (html.includes('{{paymentId}}') || html.includes('{{baseUrl}}')) {
      console.log('   ❌ FAIL: Variables not replaced');
    } else if (!html.includes(paymentData.paymentId)) {
      console.log('   ❌ FAIL: paymentId not found in output');
    } else {
      console.log('   ✅ PASS: All variables replaced correctly\n');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
  }

  // Test 3: Booking Status Update Email
  console.log('3️⃣ Testing Booking Status Update Email');
  try {
    const statusData: BookingStatusUpdateData = {
      customerName: 'Bob Johnson',
      customerEmail: 'bob@example.com',
      tourTitle: 'Desert Safari',
      bookingId: 'EEO-98765432-DEF456',
      bookingDate: 'Saturday, February 10, 2024',
      bookingTime: '2:00 PM',
      newStatus: 'Confirmed',
      statusMessage: 'Your booking has been confirmed!',
      additionalInfo: 'Please arrive 15 minutes early',
      baseUrl: baseUrl,
    };

    const template = await TemplateEngine.loadTemplate('booking-update');
    const html = TemplateEngine.replaceVariables(template, statusData);

    if (html.includes('{{newStatus}}') || html.includes('{{baseUrl}}')) {
      console.log('   ❌ FAIL: Variables not replaced');
    } else if (!html.includes('status-Confirmed') && !html.includes('status-confirmed')) {
      console.log('   ❌ FAIL: Status class not found in output');
    } else if (!html.includes(statusData.statusMessage)) {
      console.log('   ❌ FAIL: statusMessage not found in output');
    } else {
      console.log('   ✅ PASS: All variables replaced correctly\n');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
  }

  // Test 4: Conditional Rendering
  console.log('4️⃣ Testing Conditional Rendering ({{#if}}...{{/if}})');
  try {
    const dataWithSpecialRequests: BookingEmailData = {
      customerName: 'Alice Cooper',
      customerEmail: 'alice@example.com',
      tourTitle: 'Alexandria Day Trip',
      bookingDate: 'Thursday, March 5, 2024',
      bookingTime: '8:00 AM',
      participants: '3 participants',
      totalPrice: '$249.00',
      bookingId: 'EEO-11223344-GHI789',
      specialRequests: 'Wheelchair accessible',
      baseUrl: baseUrl,
    };

    const dataWithoutSpecialRequests: BookingEmailData = {
      ...dataWithSpecialRequests,
      specialRequests: undefined,
    };

    const template = await TemplateEngine.loadTemplate('booking-confirmation');
    const htmlWithSpecialRequests = TemplateEngine.replaceVariables(template, dataWithSpecialRequests);
    const htmlWithoutSpecialRequests = TemplateEngine.replaceVariables(template, dataWithoutSpecialRequests);

    if (htmlWithSpecialRequests.includes('Wheelchair accessible')) {
      console.log('   ✅ PASS: Special requests shown when provided');
    } else {
      console.log('   ❌ FAIL: Special requests not shown when provided');
    }

    if (!htmlWithoutSpecialRequests.includes('Your Special Requests')) {
      console.log('   ✅ PASS: Special requests section hidden when not provided\n');
    } else {
      console.log('   ❌ FAIL: Special requests section shown when not provided\n');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
  }

  // Test 5: Falsy Value Handling
  console.log('5️⃣ Testing Falsy Value Handling');
  try {
    const dataWithFalsyValues = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      tourTitle: '',  // Empty string
      bookingDate: 'Today',
      bookingTime: '0',  // Zero as string
      participants: '0',  // Zero participants
      totalPrice: '$0.00',
      bookingId: 'TEST-123',
      contactNumber: '+20 11 42255624',
      baseUrl: baseUrl,
    };

    const template = await TemplateEngine.loadTemplate('booking-confirmation');
    const html = TemplateEngine.replaceVariables(template, dataWithFalsyValues);

    const unreplacedVars = html.match(/{{[^}]+}}/g);
    if (!unreplacedVars || unreplacedVars.length === 0) {
      console.log('   ✅ PASS: No unreplaced template variables\n');
    } else {
      console.log(`   ⚠️  WARNING: Found unreplaced variables: ${unreplacedVars.join(', ')}`);
      console.log('   (These might be optional fields)\n');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
  }

  console.log('✨ Email Template Testing Complete!\n');
}

// Run tests
testEmailTemplates().catch(console.error);
