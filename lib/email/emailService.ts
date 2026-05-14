// lib/email/emailService.ts
import { TemplateEngine } from './templateEngine';
import { sendEmail } from '../mailgun';
import { generateBookingVerificationURL } from '@/lib/utils/qrcode';
import { generateReceiptPdf, ReceiptPayload } from '@/lib/utils/generateReceiptPdf';
import type {
  EmailType,
  BookingEmailData,
  PaymentEmailData,
  BankTransferEmailData,
  TripReminderData,
  TripCompletionData,
  CancellationData,
  WelcomeEmailData,
  AdminAlertData,
  AdminBookingStatusNotificationData,
  BookingStatusUpdateData,
  AdminInviteEmailData,
  AdminAccessUpdateEmailData,
  EmailTemplate,
  TenantEmailBranding
} from './type';

export class EmailService {
  // Default subjects - {{companyName}} will be replaced with tenant name
  private static readonly subjects: Record<EmailType, string> = {
    'booking-confirmation': '🎉 Booking Confirmed - {{tourTitle}}',
    'payment-confirmation': '✅ Payment Confirmed - {{tourTitle}}',
    'bank-transfer-instructions': '🏦 Bank Transfer Instructions - {{tourTitle}}',
    'trip-reminder': '⏰ Your Trip is Tomorrow - {{tourTitle}}',
    'trip-completion': '🌟 Thank You for Traveling with {{companyName}}!',
    'booking-cancellation': '❌ Booking Cancelled - {{tourTitle}}',
    'booking-update': '📢 Booking Status Update - {{tourTitle}}',
    'welcome': '🎊 Welcome to {{companyName}}!',
    'admin-booking-alert': '[{{companyName}}] New Booking - {{tourTitle}}',
    'admin-invite': "You've been invited to manage {{companyName}}",
    'admin-access-update': 'Your admin access has been {{action}}'
  };

  // Helper to extract branding data for templates
  private static getBrandingTemplateData(branding?: TenantEmailBranding) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
    const website = branding?.website || baseUrl;
    const assetBase = website.startsWith('http') ? website : `https://${website}`;

    let companyLogo = branding?.logo || '';
    if (companyLogo && companyLogo.startsWith('/')) {
      companyLogo = `${assetBase.replace(/\/$/, '')}${companyLogo}`;
    } else if (companyLogo && !companyLogo.startsWith('http')) {
      companyLogo = `https://${companyLogo}`;
    }
    if (!companyLogo || companyLogo === '/' || companyLogo === 'https://') {
      companyLogo = `${baseUrl.replace(/\/$/, '')}/EEO-logo.png`;
    }

    return {
      companyName: branding?.companyName || 'Excursions Online',
      companyLogo,
      primaryColor: branding?.primaryColor || '#E63946',
      secondaryColor: branding?.secondaryColor || '#1D3557',
      accentColor: branding?.accentColor || '#F4A261',
      contactEmail: branding?.contactEmail || 'info@excursions.online',
      contactPhone: branding?.contactPhone || '',
      supportEmail: branding?.supportEmail || branding?.contactEmail || 'support@excursions.online',
      website,
      facebookUrl: branding?.socialLinks?.facebook,
      instagramUrl: branding?.socialLinks?.instagram,
      twitterUrl: branding?.socialLinks?.twitter,
    };
  }

  private static escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static async generateEmailTemplate(
    type: EmailType,
    data: any,
    branding?: TenantEmailBranding
  ): Promise<EmailTemplate> {
    try {
      // Merge branding data with template data
      const brandingData = this.getBrandingTemplateData(branding);
      const templateData = {
        year: new Date().getFullYear(),
        ...brandingData,
        ...data,
      };
      const htmlTemplate = await TemplateEngine.loadTemplate(type);
      const html = TemplateEngine.replaceVariables(htmlTemplate, templateData);
      const subject = TemplateEngine.generateSubject(this.subjects[type], templateData);
      return { subject, html };
    } catch (error) {
      console.error(`Error generating email template for ${type}:`, error);
      throw error;
    }
  }

  // BOOKING CONFIRMATION
  static async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    // Generate QR code for booking verification
    const verificationUrl = generateBookingVerificationURL(data.bookingId);
    let qrCodeBuffer: Buffer | null = null;
    let receiptPdfBuffer: Buffer | null = null;
    const branding = data.tenantBranding;

    try {
      // Import the buffer generation function
      const { generateQRCodeBuffer } = await import('@/lib/utils/qrcode');
      qrCodeBuffer = await generateQRCodeBuffer(verificationUrl, {
        width: 300,
        margin: 2,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Generate receipt PDF using the same format as the checkout page
    try {
      // Build receipt payload matching the checkout page format exactly
      const receiptPayload: ReceiptPayload = {
        orderId: data.bookingId,
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        orderedItems: (data.orderedItems || []).map(item => ({
          title: item.title,
          quantity: item.quantity ?? item.adults ?? 1,
          childQuantity: item.childQuantity ?? item.children ?? 0,
          infantQuantity: item.infantQuantity ?? item.infants ?? 0,
          price: item.price,
          totalPrice: item.totalPrice ? parseFloat(item.totalPrice.replace(/[^0-9.-]/g, '')) : undefined,
          selectedBookingOption: item.selectedBookingOption,
        })),
        pricing: data.pricingRaw || {
          symbol: data.pricingDetails?.currencySymbol || '$',
          subtotal: parseFloat(data.pricingDetails?.subtotal?.replace(/[^0-9.-]/g, '') || '0'),
          serviceFee: parseFloat(data.pricingDetails?.serviceFee?.replace(/[^0-9.-]/g, '') || '0'),
          tax: parseFloat(data.pricingDetails?.tax?.replace(/[^0-9.-]/g, '') || '0'),
          discount: parseFloat(data.pricingDetails?.discount?.replace(/[^0-9.-]/g, '') || '0'),
          total: parseFloat(data.pricingDetails?.total?.replace(/[^0-9.-]/g, '') || data.totalPrice?.replace(/[^0-9.-]/g, '') || '0'),
        },
        booking: {
          date: data.bookingDate,
          time: data.bookingTime,
        },
        qrData: verificationUrl,
      };

      receiptPdfBuffer = await generateReceiptPdf(receiptPayload);
      console.log(`📄 Generated receipt PDF: ${receiptPdfBuffer.length} bytes`);
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
    }

    // Add QR code CID reference to email data
    const emailData = {
      ...data,
      verificationUrl,
      qrCodeCid: qrCodeBuffer ? 'booking-qr-code' : undefined,
    };

    try {
      const template = await this.generateEmailTemplate('booking-confirmation', emailData, branding);

      // Build inline attachments (QR code for email body)
      const inlineAttachments = qrCodeBuffer ? [
        {
          filename: 'qr-code.png',
          data: qrCodeBuffer,
          cid: 'booking-qr-code'
        }
      ] : [];

      // Build regular attachments (receipt PDF)
      const attachments = receiptPdfBuffer ? [
        {
          filename: `booking-ticket-${data.bookingId}.pdf`,
          data: receiptPdfBuffer,
          contentType: 'application/pdf'
        }
      ] : [];

      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation',
        inlineAttachments,
        attachments,
        fromName: branding?.fromName || branding?.companyName,
        fromEmail: branding?.fromEmail
      });

      console.log(`✅ Booking confirmation sent with QR code and receipt PDF attached`);
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      // Fallback: send email without attachments
      const fallbackData = {
        ...data,
        verificationUrl,
      };
      const template = await this.generateEmailTemplate('booking-confirmation', fallbackData, branding);
      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation',
        fromName: branding?.fromName || branding?.companyName,
        fromEmail: branding?.fromEmail
      });
    }
  }

  // PAYMENT CONFIRMATION
  static async sendPaymentConfirmation(data: PaymentEmailData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('payment-confirmation', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'payment-confirmation',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // BANK TRANSFER INSTRUCTIONS
  static async sendBankTransferInstructions(data: BankTransferEmailData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('bank-transfer-instructions', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'bank-transfer-instructions',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // TRIP REMINDER (24H BEFORE)
  static async sendTripReminder(data: TripReminderData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('trip-reminder', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-reminder',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // TRIP COMPLETION + REVIEW REQUEST
  static async sendTripCompletion(data: TripCompletionData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('trip-completion', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-completion',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // BOOKING CANCELLATION
  static async sendCancellationConfirmation(data: CancellationData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('booking-cancellation', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-cancellation',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // BOOKING STATUS UPDATE
  static async sendBookingStatusUpdate(data: BookingStatusUpdateData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('booking-update', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-update',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // WELCOME EMAIL
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('welcome', data, branding);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'welcome',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  // ADMIN BOOKING ALERT
  static async sendAdminBookingAlert(data: AdminAlertData & { tenantBranding?: TenantEmailBranding; adminEmail?: string; adminCcEmail?: string }): Promise<void> {
    // Always send TO the central admin email (ADMIN_NOTIFICATION_EMAIL)
    // Tenant contact email and CC email are merged into CC list
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const branding = data.tenantBranding;

    if (!adminEmail) {
      console.error('⚠️ ADMIN_NOTIFICATION_EMAIL env var is not set. Admin/operator notification for booking', data.bookingId, 'was NOT sent.');
      return;
    }

    console.log(`📧 [Admin Alert] Booking ${data.bookingId} → TO: ${adminEmail}`);

    try {
      const template = await this.generateEmailTemplate('admin-booking-alert', data, branding);

      await sendEmail({
        to: adminEmail,
        subject: template.subject,
        html: template.html,
        type: 'admin-booking-alert',
        fromName: branding?.companyName || 'Excursions Online',
      });

      console.log(`✅ Admin alert sent for booking ${data.bookingId} to ${adminEmail}`);
    } catch (sendError) {
      console.error(`❌ Failed to send admin alert for booking ${data.bookingId}:`, sendError);
      throw sendError;
    }
  }

  static async sendAdminBookingStatusUpdate(data: AdminBookingStatusNotificationData & { tenantBranding?: TenantEmailBranding }): Promise<void> {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const branding = data.tenantBranding;

    if (!adminEmail) {
      console.error('⚠️ ADMIN_NOTIFICATION_EMAIL env var is not set. Admin/operator status notification for booking', data.bookingId, 'was NOT sent.');
      return;
    }

    const brandingData = this.getBrandingTemplateData(branding);
    const ccCandidates = [
      data.adminCcEmail,
      branding?.supportEmail,
      branding?.contactEmail,
    ].filter(Boolean) as string[];
    const uniqueCc = Array.from(new Set(
      ccCandidates.filter((email) => email.toLowerCase() !== adminEmail.toLowerCase())
    ));

    const esc = (value: unknown) => this.escapeHtml(value);
    const subject = `[${brandingData.companyName}] Booking Status Updated - ${data.bookingId}`;
    const adminDashboardLink = data.adminDashboardLink || (
      data.baseUrl ? `${data.baseUrl.replace(/\/$/, '')}/admin/bookings/${data.bookingId}` : ''
    );

    const statusColor = data.newStatus === 'Cancelled'
      ? '#991b1b'
      : data.newStatus === 'Pending'
        ? '#92400e'
        : '#166534';
    const statusBg = data.newStatus === 'Cancelled'
      ? '#fee2e2'
      : data.newStatus === 'Pending'
        ? '#fef3c7'
        : '#dcfce7';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <title>${esc(subject)}</title>
      </head>
      <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, Helvetica, sans-serif; color:#172033;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
          Booking ${esc(data.bookingId)} changed from ${esc(data.oldStatus)} to ${esc(data.newStatus)}.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
          <tr>
            <td align="center" style="padding:28px 12px;">
              <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px; max-width:640px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 12px 30px rgba(15,23,42,0.08);">
                <tr><td style="height:4px; background:${esc(brandingData.primaryColor)}; font-size:0; line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:24px 32px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:54px; vertical-align:middle;">
                                <img src="${esc(brandingData.companyLogo)}" width="44" height="44" alt="${esc(brandingData.companyName)}" style="display:block; width:44px; height:44px; border-radius:10px; object-fit:contain; background:#ffffff; border:0;">
                              </td>
                              <td style="vertical-align:middle;">
                                <div style="font-size:15px; line-height:20px; font-weight:700; color:#111827;">${esc(brandingData.companyName)}</div>
                                <div style="font-size:12px; line-height:18px; color:#6b7280;">Admin notification</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block; padding:8px 14px; border-radius:999px; background:${statusBg}; color:${statusColor}; font-size:12px; line-height:16px; font-weight:700; text-transform:uppercase;">${esc(data.newStatus)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px;"><div style="height:1px; background:#edf0f3; line-height:1px;">&nbsp;</div></td>
                </tr>
                <tr>
                  <td style="padding:28px 32px 8px;">
                    <p style="margin:0 0 8px; font-size:13px; line-height:18px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;">Booking ${esc(data.bookingId)}</p>
                    <h1 style="margin:0 0 12px; font-size:25px; line-height:32px; color:#111827; font-weight:800;">Booking status updated</h1>
                    <p style="margin:0; font-size:15px; line-height:24px; color:#4b5563;">${esc(data.changedBy || 'Admin')} changed <strong style="color:#111827;">${esc(data.tourTitle)}</strong> from ${esc(data.oldStatus)} to ${esc(data.newStatus)}.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px;">
                      <tr>
                        <td style="padding:18px 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%" style="padding-right:10px;">
                                <div style="font-size:12px; color:#6b7280; font-weight:700; text-transform:uppercase;">Previous</div>
                                <div style="margin-top:8px; font-size:18px; color:#111827; font-weight:800;">${esc(data.oldStatus)}</div>
                              </td>
                              <td width="50%" style="padding-left:10px;">
                                <div style="font-size:12px; color:#6b7280; font-weight:700; text-transform:uppercase;">Current</div>
                                <div style="margin-top:8px; font-size:18px; color:${statusColor}; font-weight:800;">${esc(data.newStatus)}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 32px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
                      <tr><td colspan="2" style="padding:14px 20px; background:#fbfcfd; border-bottom:1px solid #e5e7eb; font-size:12px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;">Booking details</td></tr>
                      <tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Customer</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;">${esc(data.customerName)}</td></tr>
                      <tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Email</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;"><a href="mailto:${esc(data.customerEmail)}" style="color:${esc(brandingData.primaryColor)}; text-decoration:none;">${esc(data.customerEmail)}</a></td></tr>
                      ${data.customerPhone ? `<tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Phone</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;">${esc(data.customerPhone)}</td></tr>` : ''}
                      <tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Tour</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;">${esc(data.tourTitle)}</td></tr>
                      <tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Date</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;">${esc(data.bookingDate)}${data.bookingTime ? ` at ${esc(data.bookingTime)}` : ''}</td></tr>
                      ${data.totalPrice ? `<tr><td style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#6b7280; font-size:13px;">Total</td><td align="right" style="padding:13px 20px; border-bottom:1px solid #f1f5f9; color:#111827; font-size:14px; font-weight:700;">${esc(data.totalPrice)}</td></tr>` : ''}
                      ${data.paymentMethod ? `<tr><td style="padding:13px 20px; color:#6b7280; font-size:13px;">Payment</td><td align="right" style="padding:13px 20px; color:#111827; font-size:14px; font-weight:700;">${esc(data.paymentMethod)}</td></tr>` : ''}
                    </table>
                  </td>
                </tr>
                ${adminDashboardLink ? `<tr><td style="padding:24px 32px 30px;"><a href="${esc(adminDashboardLink)}" style="display:inline-block; background:${esc(brandingData.primaryColor)}; color:#ffffff; padding:13px 22px; border-radius:7px; font-size:14px; line-height:20px; font-weight:700; text-decoration:none;">Open booking</a></td></tr>` : ''}
                <tr>
                  <td style="padding:18px 32px; background:#f9fafb; border-top:1px solid #edf0f3; text-align:center;">
                    <p style="margin:0; font-size:11px; line-height:17px; color:#9ca3af;">Sent by ${esc(brandingData.companyName)} admin system.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await sendEmail({
      to: adminEmail,
      cc: uniqueCc.length > 0 ? uniqueCc.join(',') : undefined,
      subject,
      html,
      type: 'admin-booking-status-update',
      fromName: branding?.companyName || 'Excursions Online',
      fromEmail: branding?.fromEmail,
    });
  }

  static async sendAdminInviteEmail(data: AdminInviteEmailData & { tenantBranding?: TenantEmailBranding }): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('admin-invite', data, branding);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-invite',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }

  static async sendAdminAccessUpdateEmail(data: AdminAccessUpdateEmailData & { tenantBranding?: TenantEmailBranding }): Promise<void> {
    const branding = data.tenantBranding;
    const template = await this.generateEmailTemplate('admin-access-update', data, branding);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-access-update',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
    });
  }
}
