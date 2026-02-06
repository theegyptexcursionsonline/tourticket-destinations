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
    'admin-booking-alert': '📋 [{{companyName}}] New Booking - {{tourTitle}}',
    'admin-invite': "You've been invited to manage {{companyName}}",
    'admin-access-update': 'Your admin access has been {{action}}'
  };

  // Helper to extract branding data for templates
  private static getBrandingTemplateData(branding?: TenantEmailBranding) {
    return {
      companyName: branding?.companyName || 'Excursions Online',
      companyLogo: branding?.logo || '/EEO-logo.png',
      primaryColor: branding?.primaryColor || '#E63946',
      secondaryColor: branding?.secondaryColor || '#1D3557',
      accentColor: branding?.accentColor || '#F4A261',
      contactEmail: branding?.contactEmail || 'info@excursions.online',
      contactPhone: branding?.contactPhone || '',
      supportEmail: branding?.supportEmail || branding?.contactEmail || 'support@excursions.online',
      website: branding?.website || 'https://excursions.online',
      facebookUrl: branding?.socialLinks?.facebook,
      instagramUrl: branding?.socialLinks?.instagram,
      twitterUrl: branding?.socialLinks?.twitter,
    };
  }

  private static async generateEmailTemplate(
    type: EmailType,
    data: Record<string, unknown>,
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
  static async sendAdminBookingAlert(data: AdminAlertData & { tenantBranding?: TenantEmailBranding; adminEmail?: string }): Promise<void> {
    // Use tenant-specific admin email if provided, otherwise fall back to env var
    const adminEmail = data.adminEmail || process.env.ADMIN_NOTIFICATION_EMAIL;
    const branding = data.tenantBranding;

    if (!adminEmail) {
      console.warn('ADMIN_NOTIFICATION_EMAIL is not set. Skipping admin notification.');
      return;
    }

    const template = await this.generateEmailTemplate('admin-booking-alert', data, branding);
    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-booking-alert',
      fromName: branding?.fromName || branding?.companyName,
      fromEmail: branding?.fromEmail
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
