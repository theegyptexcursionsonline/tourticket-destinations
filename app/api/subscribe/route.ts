// app/api/subscribe/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // --- Basic Validation ---
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // --- Mock API Logic ---
    // In a real application, you would add the email to your mailing list here
    // (e.g., Mailchimp, SendGrid, or your own database).
    
    console.log('New newsletter subscription received');

    // Simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return a success response
    return NextResponse.json({ success: true, message: 'Successfully subscribed!' });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
