// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { sendContactFormEmail } from '@/lib/mailgun';

// In-memory rate limiting (consider Redis for production)
const submissionTracker = new Map<string, number[]>();
const MAX_SUBMISSIONS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Verify reCAPTCHA token
async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!token || !process.env.RECAPTCHA_SECRET_KEY) {
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();

    // Check if score is above threshold (0.5 is recommended)
    return data.success && data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

// Get client IP address
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// Check rate limit
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const submissions = submissionTracker.get(ip) || [];

  // Remove old submissions outside the time window
  const recentSubmissions = submissions.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Update tracker
  submissionTracker.set(ip, recentSubmissions);

  // Check if limit exceeded
  if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
    return false;
  }

  // Add current submission
  recentSubmissions.push(now);
  submissionTracker.set(ip, recentSubmissions);

  return true;
}

export async function POST(request: Request) {
  try {
    const { name, email, message, recaptchaToken, submissionTime } = await request.json();

    // --- Basic Validation ---
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // --- Timing Check ---
    if (submissionTime && submissionTime < 3000) {
      console.log('Suspicious submission time:', submissionTime);
      return NextResponse.json(
        { error: 'Please wait a moment before submitting.' },
        { status: 400 }
      );
    }

    // --- Rate Limiting ---
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // --- reCAPTCHA Verification ---
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const isValid = await verifyRecaptcha(recaptchaToken);
      if (!isValid) {
        console.log('reCAPTCHA verification failed');
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // --- Send Email via Mailgun ---
    await sendContactFormEmail({ name, fromEmail: email, message });

    return NextResponse.json({ success: true, message: 'Message sent successfully!' });

  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again later.' }, { status: 500 });
  }
}
