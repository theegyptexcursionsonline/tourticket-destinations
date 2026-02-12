// app/api/checkout/receipt/route.ts - Premium Ticket-Style Receipt
// Uses the shared generateReceiptPdf utility for consistency
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    // Require authentication to generate receipts
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required to generate receipts' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let authenticated = false;

    // Try Firebase auth first
    const firebaseResult = await verifyFirebaseToken(token);
    if (firebaseResult.success && firebaseResult.uid) {
      authenticated = true;
    }

    // Fallback to JWT (admin tokens)
    if (!authenticated) {
      const payload = await verifyToken(token);
      if (payload && payload.sub) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        { message: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      orderId,
      customer = {},
      orderedItems = [],
      pricing = {},
      booking = {},
      qrData,
      notes,
    } = body;

    // Use the shared PDF generation utility
    const pdfBuffer = await generateReceiptPdf({
      orderId,
      customer,
      orderedItems,
      pricing,
      booking,
      qrData,
      notes,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${orderId ?? Date.now()}.pdf"`,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Receipt route error:', message);
    return NextResponse.json({
      message: 'Failed to generate receipt',
      error: message
    }, { status: 500 });
  }
}
