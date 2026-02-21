// app/api/checkout/receipt/route.ts - Premium Ticket-Style Receipt
// Uses the shared generateReceiptPdf utility for consistency
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';

export async function POST(req: NextRequest) {
  try {
    // No auth required — receipt is generated from client-provided data
    // for the booking that was just completed (including guest checkout)
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

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
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
