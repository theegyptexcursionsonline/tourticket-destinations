// lib/utils/generateReceiptPdf.ts - Shared Receipt PDF Generator
// This is the exact same logic used by /api/checkout/receipt
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { Buffer } from 'buffer';
import { parseLocalDate } from '@/utils/date';

let QR: typeof import('qrcode') | null = null;
try {
  QR = require('qrcode');
} catch {
  QR = null;
}

// Helper functions
const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0, 0, 0);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
};

const toNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const tentativeLine = currentLine ? `${currentLine} ${word}` : word;
    const tentativeWidth = font.widthOfTextAtSize(tentativeLine, size);

    if (tentativeWidth <= maxWidth || currentLine === '') {
      currentLine = tentativeLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const calculateItemTotal = (item: ReceiptOrderedItem) => {
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

// Types matching the checkout page payload format
export interface ReceiptOrderedItem {
  title?: string;
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  price?: number;
  discountPrice?: number;
  totalPrice?: number;
  finalPrice?: number;
  selectedBookingOption?: {
    title?: string;
    price?: number;
  };
  selectedAddOns?: Record<string, number>;
  selectedAddOnDetails?: Record<string, { price: number; perGuest: boolean }>;
}

export interface ReceiptPricing {
  subtotal?: number;
  serviceFee?: number;
  tax?: number;
  discount?: number;
  total?: number;
  currency?: string;
  symbol?: string;
}

export interface ReceiptCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ReceiptBooking {
  date?: string;
  time?: string;
  guests?: number;
  specialRequests?: string;
}

export interface ReceiptPayload {
  orderId: string;
  customer?: ReceiptCustomer;
  orderedItems?: ReceiptOrderedItem[];
  pricing?: ReceiptPricing;
  booking?: ReceiptBooking;
  qrData?: string;
  notes?: string;
}

export async function generateReceiptPdf(payload: ReceiptPayload): Promise<Buffer> {
  const {
    orderId,
    customer = {},
    orderedItems = [],
    pricing = {},
    booking = {},
    qrData,
  } = payload;

  const currencySymbol = pricing?.symbol ?? '$';
  const subtotal = round2(toNumber(pricing?.subtotal ?? 0));
  const serviceFee = round2(toNumber(pricing?.serviceFee ?? 0));
  const tax = round2(toNumber(pricing?.tax ?? 0));
  const discount = round2(toNumber(pricing?.discount ?? 0));
  const total = round2(toNumber(pricing?.total ?? 0));

  // Parse booking date
  const bookingDateStr = booking?.date || new Date().toISOString().split('T')[0];
  const bookingDate = parseLocalDate(bookingDateStr) || new Date();
  const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayNum = bookingDate.getDate().toString();
  const month = bookingDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

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

  // TOP GRADIENT BAR
  const barHeight = 8;
  const barWidth = pageWidth - margin * 2;
  const sectionWidth = barWidth / 3;

  page.drawRectangle({ x: margin, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.rose });
  page.drawRectangle({ x: margin + sectionWidth, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.orange });
  page.drawRectangle({ x: margin + sectionWidth * 2, y: y - barHeight, width: sectionWidth, height: barHeight, color: colors.amber });

  y -= barHeight + 25;

  // HEADER SECTION - Status badges
  page.drawRectangle({ x: margin, y: y - 14, width: 70, height: 18, color: colors.emeraldLight });
  page.drawText('CONFIRMED', { x: margin + 8, y: y - 10, font: boldFont, size: 8, color: colors.emerald });

  page.drawRectangle({ x: margin + 78, y: y - 14, width: 55, height: 18, color: colors.veryLightGray });
  page.drawText('E-TICKET', { x: margin + 86, y: y - 10, font: boldFont, size: 8, color: colors.gray });

  y -= 35;

  // Tour title and subtitle
  const firstItem = orderedItems[0];
  const tourTitle = orderedItems.length === 1
    ? firstItem?.title || 'Tour Booking'
    : `${orderedItems.length} Tours Booked`;

  const textBlockTopY = y;
  const dateBadgeWidth = 70;
  const titleMaxWidth = pageWidth - margin * 2 - dateBadgeWidth - 30;
  const titleLines = wrapText(tourTitle, boldFont, 18, titleMaxWidth);

  titleLines.forEach((line) => {
    page.drawText(line, { x: margin, y, font: boldFont, size: 18, color: colors.black });
    y -= 22;
  });

  if (firstItem?.selectedBookingOption?.title) {
    const subtitleLines = wrapText(firstItem.selectedBookingOption.title, font, 11, titleMaxWidth);
    subtitleLines.forEach((line) => {
      page.drawText(line, { x: margin, y, font, size: 11, color: colors.gray });
      y -= 16;
    });
  } else {
    y -= 8;
  }

  // Date badge (right side)
  const dateBadgeHeight = 75;
  const dateBadgeX = pageWidth - margin - dateBadgeWidth;
  const dateBadgeY = textBlockTopY - 15;

  page.drawRectangle({
    x: dateBadgeX, y: dateBadgeY, width: dateBadgeWidth, height: dateBadgeHeight,
    color: colors.white, borderColor: colors.veryLightGray, borderWidth: 1,
  });

  const dowWidth = boldFont.widthOfTextAtSize(dayOfWeek, 9);
  page.drawText(dayOfWeek, { x: dateBadgeX + (dateBadgeWidth - dowWidth) / 2, y: dateBadgeY + dateBadgeHeight - 18, font: boldFont, size: 9, color: colors.rose });

  const dayWidth = boldFont.widthOfTextAtSize(dayNum, 28);
  page.drawText(dayNum, { x: dateBadgeX + (dateBadgeWidth - dayWidth) / 2, y: dateBadgeY + dateBadgeHeight - 48, font: boldFont, size: 28, color: colors.black });

  const monthWidth = boldFont.widthOfTextAtSize(month, 10);
  page.drawText(month, { x: dateBadgeX + (dateBadgeWidth - monthWidth) / 2, y: dateBadgeY + 12, font: boldFont, size: 10, color: colors.gray });

  y -= 55;

  // PERFORATED DIVIDER
  y -= 15;
  page.drawCircle({ x: margin - 10, y: y, size: 15, color: colors.veryLightGray });
  page.drawCircle({ x: pageWidth - margin + 10, y: y, size: 15, color: colors.veryLightGray });
  drawDashedLine(page, margin + 10, y, pageWidth - margin - 10, 6, 4, colors.lightGray, 1);
  y -= 30;

  // BOOKING INFO GRID
  const gridY = y;
  const colWidth = (pageWidth - margin * 2) / 4;

  page.drawText('BOOKING ID', { x: margin, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
  page.drawText(orderId || '—', { x: margin, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

  page.drawText('TIME', { x: margin + colWidth, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
  page.drawText(booking?.time || 'Flexible', { x: margin + colWidth, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

  const totalGuests = orderedItems.reduce((sum: number, item) => {
    return sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0);
  }, 0);
  page.drawText('GUESTS', { x: margin + colWidth * 2, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
  page.drawText(`${totalGuests} Total`, { x: margin + colWidth * 2, y: gridY - 14, font: boldFont, size: 11, color: colors.black });

  page.drawText('STATUS', { x: margin + colWidth * 3, y: gridY, font: boldFont, size: 8, color: colors.lightGray });
  page.drawText('Confirmed', { x: margin + colWidth * 3, y: gridY - 14, font: boldFont, size: 11, color: colors.emerald });

  y -= 50;

  // LARGE QR CODE SECTION
  const qrSectionY = y;
  const qrSize = 140;
  const qrX = (pageWidth - qrSize) / 2;

  page.drawRectangle({
    x: margin, y: qrSectionY - qrSize - 40,
    width: pageWidth - margin * 2, height: qrSize + 60, color: colors.black,
  });

  const scanTitle = 'SCAN FOR BOOKING DETAILS';
  const scanTitleWidth = boldFont.widthOfTextAtSize(scanTitle, 10);
  page.drawText(scanTitle, { x: (pageWidth - scanTitleWidth) / 2, y: qrSectionY - 18, font: boldFont, size: 10, color: colors.lightGray });

  // Generate and embed QR code
  if (qrData && QR) {
    try {
      const pngBuffer = await QR.toBuffer(String(qrData), {
        type: 'png',
        width: 400,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      const qrPngBuffer = Buffer.from(pngBuffer);
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);
      page.drawImage(qrImage, { x: qrX, y: qrSectionY - qrSize - 28, width: qrSize, height: qrSize });
    } catch {
      page.drawRectangle({ x: qrX, y: qrSectionY - qrSize - 28, width: qrSize, height: qrSize, color: colors.white });
      page.drawText('QR Code', { x: qrX + 40, y: qrSectionY - qrSize / 2 - 28, font: font, size: 12, color: colors.gray });
    }
  } else {
    page.drawRectangle({ x: qrX, y: qrSectionY - qrSize - 28, width: qrSize, height: qrSize, color: colors.white });
  }

  y = qrSectionY - qrSize - 70;

  // GUEST INFORMATION
  y -= 15;
  page.drawRectangle({ x: margin, y: y - 70, width: pageWidth - margin * 2, height: 85, color: colors.veryLightGray });
  page.drawText('GUEST INFORMATION', { x: margin + 15, y: y - 5, font: boldFont, size: 9, color: colors.lightGray });

  const guestInfoY = y - 28;
  const halfWidth = (pageWidth - margin * 2) / 2;

  page.drawText('Name', { x: margin + 15, y: guestInfoY, font: font, size: 8, color: colors.lightGray });
  page.drawText(customer?.name || 'Guest', { x: margin + 15, y: guestInfoY - 12, font: boldFont, size: 10, color: colors.black });

  page.drawText('Email', { x: margin + halfWidth, y: guestInfoY, font: font, size: 8, color: colors.lightGray });
  const emailText = (customer?.email || '—').substring(0, 30);
  page.drawText(emailText, { x: margin + halfWidth, y: guestInfoY - 12, font: boldFont, size: 10, color: colors.black });

  if (customer?.phone) {
    page.drawText('Phone', { x: margin + 15, y: guestInfoY - 30, font: font, size: 8, color: colors.lightGray });
    page.drawText(customer.phone, { x: margin + 15, y: guestInfoY - 42, font: boldFont, size: 10, color: colors.black });
  }

  y -= 100;

  // ORDER SUMMARY
  y -= 10;
  page.drawText('ORDER SUMMARY', { x: margin, y: y, font: boldFont, size: 9, color: colors.lightGray });
  y -= 20;

  orderedItems.forEach((item) => {
    const itemTotal = item.totalPrice ?? item.finalPrice ?? calculateItemTotal(item);
    const title = (item.title || 'Tour').substring(0, 40) + ((item.title?.length ?? 0) > 40 ? '...' : '');

    page.drawRectangle({
      x: margin, y: y - 35, width: pageWidth - margin * 2, height: 45,
      color: colors.white, borderColor: colors.veryLightGray, borderWidth: 1,
    });

    page.drawText(title, { x: margin + 12, y: y - 12, font: boldFont, size: 10, color: colors.black });

    const participantText = [
      (item.quantity ?? 0) > 0 ? `${item.quantity} Adult${(item.quantity ?? 0) > 1 ? 's' : ''}` : '',
      (item.childQuantity ?? 0) > 0 ? `${item.childQuantity} Child${(item.childQuantity ?? 0) > 1 ? 'ren' : ''}` : '',
    ].filter(Boolean).join(', ');

    page.drawText(participantText, { x: margin + 12, y: y - 26, font: font, size: 9, color: colors.gray });

    const priceText = `${currencySymbol}${toNumber(itemTotal).toFixed(2)}`;
    const priceWidth = boldFont.widthOfTextAtSize(priceText, 12);
    page.drawText(priceText, { x: pageWidth - margin - priceWidth - 12, y: y - 18, font: boldFont, size: 12, color: colors.black });

    y -= 55;
  });

  // PRICING BREAKDOWN
  y -= 5;
  drawDashedLine(page, margin, y, pageWidth - margin, 4, 3, colors.lightGray, 1);
  y -= 20;

  const pricingX = pageWidth - margin - 150;

  page.drawText('Subtotal', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
  const subtotalText = `${currencySymbol}${subtotal.toFixed(2)}`;
  const subtotalWidth = font.widthOfTextAtSize(subtotalText, 10);
  page.drawText(subtotalText, { x: pageWidth - margin - subtotalWidth, y: y, font: font, size: 10, color: colors.gray });
  y -= 16;

  page.drawText('Service fee', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
  const serviceFeeText = `${currencySymbol}${serviceFee.toFixed(2)}`;
  const serviceFeeWidth = font.widthOfTextAtSize(serviceFeeText, 10);
  page.drawText(serviceFeeText, { x: pageWidth - margin - serviceFeeWidth, y: y, font: font, size: 10, color: colors.gray });
  y -= 16;

  page.drawText('Taxes & fees', { x: pricingX, y: y, font: font, size: 10, color: colors.gray });
  const taxText = `${currencySymbol}${tax.toFixed(2)}`;
  const taxWidth = font.widthOfTextAtSize(taxText, 10);
  page.drawText(taxText, { x: pageWidth - margin - taxWidth, y: y, font: font, size: 10, color: colors.gray });
  y -= 16;

  if (discount > 0) {
    page.drawText('Discount', { x: pricingX, y: y, font: font, size: 10, color: colors.emerald });
    const discountText = `-${currencySymbol}${discount.toFixed(2)}`;
    const discountWidth = font.widthOfTextAtSize(discountText, 10);
    page.drawText(discountText, { x: pageWidth - margin - discountWidth, y: y, font: font, size: 10, color: colors.emerald });
    y -= 16;
  }

  y -= 8;

  page.drawRectangle({ x: pricingX - 15, y: y - 8, width: pageWidth - margin - pricingX + 15, height: 28, color: colors.veryLightGray });
  page.drawText('Total Paid', { x: pricingX, y: y, font: boldFont, size: 11, color: colors.black });
  const totalText = `${currencySymbol}${total.toFixed(2)}`;
  const totalWidth = boldFont.widthOfTextAtSize(totalText, 16);
  page.drawText(totalText, { x: pageWidth - margin - totalWidth, y: y - 2, font: boldFont, size: 16, color: colors.black });

  // BOTTOM GRADIENT BAR
  const bottomBarY = 30;
  page.drawRectangle({ x: margin, y: bottomBarY, width: sectionWidth, height: 6, color: colors.rose });
  page.drawRectangle({ x: margin + sectionWidth, y: bottomBarY, width: sectionWidth, height: 6, color: colors.orange });
  page.drawRectangle({ x: margin + sectionWidth * 2, y: bottomBarY, width: sectionWidth, height: 6, color: colors.amber });

  // FOOTER
  const footerText = 'Egypt Excursions Online  •  booking@egypt-excursionsonline.com  •  www.egypt-excursionsonline.com';
  const footerWidth = font.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, { x: (pageWidth - footerWidth) / 2, y: 15, font: font, size: 8, color: colors.lightGray });

  // Generate PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
