// app/api/checkout/receipt/route.ts - Premium Ticket-Style Receipt
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { Buffer } from 'buffer';

let QR: any = null;
try {
  QR = require('qrcode');
} catch (e) {
  QR = null;
}

// Helper functions
const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0, 0, 0);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
};

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const calculateItemTotal = (item: any) => {
  const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
  const adultPrice = basePrice * (item.quantity || 1);
  const childPrice = (basePrice / 2) * (item.childQuantity || 0);
  let tourTotal = adultPrice + childPrice;

  let addOnsTotal = 0;
  if (item.selectedAddOns && item.selectedAddOnDetails) {
    Object.entries(item.selectedAddOns).forEach(([addOnId, qty]) => {
      const addOnDetail = item.selectedAddOnDetails?.[addOnId];
      const qtyNum = Number(qty) || 0;
      if (addOnDetail && qtyNum > 0) {
        const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
        const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
        addOnsTotal += addOnDetail.price * addOnQuantity;
      }
    });
  }

  return tourTotal + addOnsTotal;
};

// Draw rounded rectangle helper
const drawRoundedRect = (
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: ReturnType<typeof rgb>
) => {
  // Simplified rounded rect using regular rect (pdf-lib doesn't have native rounded rect)
  page.drawRectangle({ x, y, width, height, color });
};

// Draw dashed line helper
const drawDashedLine = (
  page: PDFPage,
  startX: number,
  startY: number,
  endX: number,
  dashLength: number,
  gapLength: number,
  color: ReturnType<typeof rgb>,
  thickness: number
) => {
  let currentX = startX;
  while (currentX < endX) {
    const dashEnd = Math.min(currentX + dashLength, endX);
    page.drawLine({
      start: { x: currentX, y: startY },
      end: { x: dashEnd, y: startY },
      thickness,
      color,
    });
    currentX = dashEnd + gapLength;
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      customer = {},
      orderedItems = [],
      pricing = {},
      booking = {},
      qrData,
    } = body;

    const currencySymbol = pricing?.symbol ?? '$';
    const subtotal = round2(toNumber(pricing?.subtotal ?? 0));
    const serviceFee = round2(toNumber(pricing?.serviceFee ?? 0));
    const tax = round2(toNumber(pricing?.tax ?? 0));
    const discount = round2(toNumber(pricing?.discount ?? 0));
    const total = round2(toNumber(pricing?.total ?? 0));

    // Parse booking date
    const bookingDateStr = booking?.date || new Date().toLocaleDateString();
    const bookingDate = new Date(bookingDateStr);
    const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = bookingDate.getDate().toString();
    const month = bookingDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = bookingDate.getFullYear().toString();

    // Create PDF - ticket size (wider format)
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595;
    const pageHeight = 900;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const margin = 40;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const colors = {
      black: hexToRgb('#0f172a'),
      darkGray: hexToRgb('#334155'),
      gray: hexToRgb('#64748b'),
      lightGray: hexToRgb('#94a3b8'),
      veryLightGray: hexToRgb('#f1f5f9'),
      white: rgb(1, 1, 1),
      rose: hexToRgb('#e11d48'),
      orange: hexToRgb('#ea580c'),
      amber: hexToRgb('#d97706'),
      emerald: hexToRgb('#059669'),
      emeraldLight: hexToRgb('#d1fae5'),
    };

    let y = pageHeight - margin;

    // ============================================
    // TOP GRADIENT BAR (simulated with sections)
    // ============================================
    const barHeight = 8;
    const barWidth = pageWidth - margin * 2;
    const sectionWidth = barWidth / 3;

    page.drawRectangle({ x: margin, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.rose });
    page.drawRectangle({ x: margin + sectionWidth, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.orange });
    page.drawRectangle({ x: margin + sectionWidth * 2, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.amber });

    y -= barHeight + 25;

    // ============================================
    // HEADER SECTION
    // ============================================

    // Status badges
    // Confirmed badge
    page.drawRectangle({ x: margin, y: y - 14, width: 70, height: 18, color: colors.emeraldLight });
    page.drawText('CONFIRMED', {
      x: margin + 8,
      y: y - 10,
      font: boldFont,
      size: 8,
      color: colors.emerald,
    });

    // E-Ticket badge
    page.drawRectangle({ x: margin + 78, y: y - 14, width: 55, height: 18, color: colors.veryLightGray });
    page.drawText('E-TICKET', {
      x: margin + 86,
      y: y - 10,
      font: boldFont,
      size: 8,
      color: colors.gray,
    });

    y -= 35;

    // Tour title
    const firstItem = orderedItems[0];
    const tourTitle = orderedItems.length === 1
      ? (firstItem?.title || 'Tour Booking').substring(0, 45) + (firstItem?.title?.length > 45 ? '...' : '')
      : `${orderedItems.length} Tours Booked`;

    page.drawText(tourTitle, {
      x: margin,
      y: y,
      font: boldFont,
      size: 18,
      color: colors.black,
      maxWidth: pageWidth - margin * 2 - 100,
    });

    y -= 18;

    // Booking option subtitle
    if (firstItem?.selectedBookingOption?.title) {
      page.drawText(firstItem.selectedBookingOption.title, {
        x: margin,
        y: y,
        font: font,
        size: 11,
        color: colors.gray,
      });
    }

    // Date badge (right side)
    const dateBadgeWidth = 70;
    const dateBadgeHeight = 75;
    const dateBadgeX = pageWidth - margin - dateBadgeWidth;
    const dateBadgeY = y - 15;

    // Date badge background
    page.drawRectangle({
      x: dateBadgeX,
      y: dateBadgeY,
      width: dateBadgeWidth,
      height: dateBadgeHeight,
      color: colors.white,
      borderColor: colors.veryLightGray,
      borderWidth: 1,
    });

    // Day of week
    const dowWidth = boldFont.widthOfTextAtSize(dayOfWeek, 9);
    page.drawText(dayOfWeek, {
      x: dateBadgeX + (dateBadgeWidth - dowWidth) / 2,
      y: dateBadgeY + dateBadgeHeight - 18,
      font: boldFont,
      size: 9,
      color: colors.rose,
    });

    // Day number
    const dayWidth = boldFont.widthOfTextAtSize(dayNum, 28);
    page.drawText(dayNum, {
      x: dateBadgeX + (dateBadgeWidth - dayWidth) / 2,
      y: dateBadgeY + dateBadgeHeight - 48,
      font: boldFont,
      size: 28,
      color: colors.black,
    });

    // Month
    const monthWidth = boldFont.widthOfTextAtSize(month, 10);
    page.drawText(month, {
      x: dateBadgeX + (dateBadgeWidth - monthWidth) / 2,
      y: dateBadgeY + 12,
      font: boldFont,
      size: 10,
      color: colors.gray,
    });

    y -= 55;

    // ============================================
    // PERFORATED DIVIDER
    // ============================================
    y -= 15;

    // Left notch
    page.drawCircle({
      x: margin - 10,
      y: y,
      size: 15,
      color: colors.veryLightGray,
    });

    // Right notch
    page.drawCircle({
      x: pageWidth - margin + 10,
      y: y,
      size: 15,
      color: colors.veryLightGray,
    });

    // Dashed line
    drawDashedLine(page, margin + 10, y, pageWidth - margin - 10, 6, 4, colors.lightGray, 1);

    y -= 30;

    // ============================================
    // BOOKING INFO GRID
    // ============================================
    const gridY = y;
    const colWidth = (pageWidth - margin * 2) / 4;

    // Booking ID
    page.drawText('BOOKING ID', { x: margin, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
    page.drawText(orderId || '—', { x: margin, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

    // Time
    page.drawText('TIME', { x: margin + colWidth, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
    page.drawText(booking?.time || 'Flexible', { x: margin + colWidth, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

    // Guests
    const totalGuests = orderedItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0);
    }, 0);
    page.drawText('GUESTS', { x: margin + colWidth * 2, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
    page.drawText(`${totalGuests} Total`, { x: margin + colWidth * 2, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

    // Status
    page.drawText('STATUS', { x: margin + colWidth * 3, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
    page.drawText('Confirmed', { x: margin + colWidth * 3, y: gridY - 14, font: boldFont, size: 11, color: colors.emerald });

    y -= 50;

    // ============================================
    // LARGE QR CODE SECTION
    // ============================================
    const qrSectionY = y;
    const qrSize = 140;
    const qrX = (pageWidth - qrSize) / 2;

    // QR Code background
    page.drawRectangle({
      x: margin,
      y: qrSectionY - qrSize - 40,
      width: pageWidth - margin * 2,
      height: qrSize + 60,
      color: colors.black,
    });

    // QR Code title
    const scanTitle = 'SCAN FOR BOOKING DETAILS';
    const scanTitleWidth = boldFont.widthOfTextAtSize(scanTitle, 10);
    page.drawText(scanTitle, {
      x: (pageWidth - scanTitleWidth) / 2,
      y: qrSectionY - 18,
      font: boldFont,
      size: 10,
      color: colors.lightGray,
    });

    // Generate and embed QR code
    if (qrData && QR) {
      try {
        const pngBuffer = await QR.toBuffer(String(qrData), {
          type: 'png',
          width: 400,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        const qrPngBuffer = Buffer.from(pngBuffer);
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);

        page.drawImage(qrImage, {
          x: qrX,
          y: qrSectionY - qrSize - 28,
          width: qrSize,
          height: qrSize,
        });
      } catch (err) {
        // Fallback: draw placeholder
        page.drawRectangle({
          x: qrX,
          y: qrSectionY - qrSize - 28,
          width: qrSize,
          height: qrSize,
          color: colors.white,
        });
        page.drawText('QR Code', {
          x: qrX + 40,
          y: qrSectionY - qrSize / 2 - 28,
          font: font,
          size: 12,
          color: colors.gray,
        });
      }
    } else {
      // Placeholder if no QR
      page.drawRectangle({
        x: qrX,
        y: qrSectionY - qrSize - 28,
        width: qrSize,
        height: qrSize,
        color: colors.white,
      });
    }

    y = qrSectionY - qrSize - 70;

    // ============================================
    // GUEST INFORMATION
    // ============================================
    y -= 15;

    page.drawRectangle({
      x: margin,
      y: y - 70,
      width: pageWidth - margin * 2,
      height: 85,
      color: colors.veryLightGray,
    });

    page.drawText('GUEST INFORMATION', {
      x: margin + 15,
      y: y - 5,
      font: boldFont,
      size: 9,
      color: colors.lightGray,
    });

    const guestInfoY = y - 28;
    const halfWidth = (pageWidth - margin * 2) / 2;

    // Name
    page.drawText('Name', { x: margin + 15, y: guestInfoY, font: font, size: 8, color: colors.lightGray });
    page.drawText(customer?.name || 'Guest', { x: margin + 15, y: guestInfoY - 12, font: boldFont, size: 10, color: colors.black });

    // Email
    page.drawText('Email', { x: margin + halfWidth, y: guestInfoY, font: font, size: 8, color: colors.lightGray });
    const emailText = (customer?.email || '—').substring(0, 30);
    page.drawText(emailText, { x: margin + halfWidth, y: guestInfoY - 12, font: boldFont, size: 10, color: colors.black });

    // Phone (if available)
    if (customer?.phone) {
      page.drawText('Phone', { x: margin + 15, y: guestInfoY - 30, font: font, size: 8, color: colors.lightGray });
      page.drawText(customer.phone, { x: margin + 15, y: guestInfoY - 42, font: boldFont, size: 10, color: colors.black });
    }

    y -= 100;

    // ============================================
    // ORDER SUMMARY
    // ============================================
    y -= 10;

    page.drawText('ORDER SUMMARY', {
      x: margin,
      y: y,
      font: boldFont,
      size: 9,
      color: colors.lightGray,
    });

    y -= 20;

    // Items
    orderedItems.forEach((item: any, index: number) => {
      const itemTotal = calculateItemTotal(item);
      const title = (item.title || 'Tour').substring(0, 40) + (item.title?.length > 40 ? '...' : '');

      // Item row background
      page.drawRectangle({
        x: margin,
        y: y - 35,
        width: pageWidth - margin * 2,
        height: 45,
        color: colors.white,
        borderColor: colors.veryLightGray,
        borderWidth: 1,
      });

      // Item title
      page.drawText(title, {
        x: margin + 12,
        y: y - 12,
        font: boldFont,
        size: 10,
        color: colors.black,
      });

      // Participant info
      const participantText = [
        item.quantity > 0 ? `${item.quantity} Adult${item.quantity > 1 ? 's' : ''}` : '',
        item.childQuantity > 0 ? `${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}` : '',
      ].filter(Boolean).join(', ');

      page.drawText(participantText, {
        x: margin + 12,
        y: y - 26,
        font: font,
        size: 9,
        color: colors.gray,
      });

      // Price (right aligned)
      const priceText = `${currencySymbol}${itemTotal.toFixed(2)}`;
      const priceWidth = boldFont.widthOfTextAtSize(priceText, 12);
      page.drawText(priceText, {
        x: pageWidth - margin - priceWidth - 12,
        y: y - 18,
        font: boldFont,
        size: 12,
        color: colors.black,
      });

      y -= 55;
    });

    // ============================================
    // PRICING BREAKDOWN
    // ============================================
    y -= 5;

    // Dashed divider
    drawDashedLine(page, margin, y, pageWidth - margin, 4, 3, colors.lightGray, 1);

    y -= 20;

    const pricingX = pageWidth - margin - 150;

    // Subtotal
    page.drawText('Subtotal', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
    const subtotalText = `${currencySymbol}${subtotal.toFixed(2)}`;
    const subtotalWidth = font.widthOfTextAtSize(subtotalText, 10);
    page.drawText(subtotalText, { x: pageWidth - margin - subtotalWidth, y: y, font: font, size: 10, color: colors.gray });
    y -= 16;

    // Service fee
    page.drawText('Service fee', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
    const serviceFeeText = `${currencySymbol}${serviceFee.toFixed(2)}`;
    const serviceFeeWidth = font.widthOfTextAtSize(serviceFeeText, 10);
    page.drawText(serviceFeeText, { x: pageWidth - margin - serviceFeeWidth, y: y, font: font, size: 10, color: colors.gray });
    y -= 16;

    // Tax
    page.drawText('Taxes & fees', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
    const taxText = `${currencySymbol}${tax.toFixed(2)}`;
    const taxWidth = font.widthOfTextAtSize(taxText, 10);
    page.drawText(taxText, { x: pageWidth - margin - taxWidth, y: y, font: font, size: 10, color: colors.gray });
    y -= 16;

    // Discount (if any)
    if (discount > 0) {
      page.drawText('Discount', { x: pricingX, y: y, font: font, size: 10, color: colors.emerald });
      const discountText = `-${currencySymbol}${discount.toFixed(2)}`;
      const discountWidth = font.widthOfTextAtSize(discountText, 10);
      page.drawText(discountText, { x: pageWidth - margin - discountWidth, y: y, font: font, size: 10, color: colors.emerald });
      y -= 16;
    }

    y -= 8;

    // Total - with background
    page.drawRectangle({
      x: pricingX - 15,
      y: y - 8,
      width: pageWidth - margin - pricingX + 15,
      height: 28,
      color: colors.veryLightGray,
    });

    page.drawText('Total Paid', { x: pricingX, y: y, font: boldFont, size: 11, color: colors.black });
    const totalText = `${currencySymbol}${total.toFixed(2)}`;
    const totalWidth = boldFont.widthOfTextAtSize(totalText, 16);
    page.drawText(totalText, { x: pageWidth - margin - totalWidth, y: y - 2, font: boldFont, size: 16, color: colors.black });

    y -= 45;

    // ============================================
    // BOTTOM GRADIENT BAR
    // ============================================
    const bottomBarY = 30;
    page.drawRectangle({ x: margin, y: bottomBarY, width: sectionWidth, height: 6, color: colors.rose });
    page.drawRectangle({ x: margin + sectionWidth, y: bottomBarY, width: sectionWidth, height: 6, color: colors.orange });
    page.drawRectangle({ x: margin + sectionWidth * 2, y: bottomBarY, width: sectionWidth, height: 6, color: colors.amber });

    // ============================================
    // FOOTER
    // ============================================
    const footerText = 'Egypt Excursions Online  •  support@egyptexcursionsonline.com  •  www.egyptexcursionsonline.com';
    const footerWidth = font.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: 15,
      font: font,
      size: 8,
      color: colors.lightGray,
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${orderId ?? Date.now()}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error('Receipt route error:', err);
    return NextResponse.json({
      message: 'Failed to generate receipt',
      error: String(err?.message ?? err)
    }, { status: 500 });
  }
}
