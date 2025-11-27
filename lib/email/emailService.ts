// lib/email/emailService.ts
import { TemplateEngine } from './templateEngine';
import { sendEmail } from '../mailgun';
import { generateBookingVerificationURL } from '@/lib/utils/qrcode';
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
  EmailTemplate
} from './type';

export class EmailService {
  private static readonly subjects: Record<EmailType, string> = {
    'booking-confirmation': '🎉 Booking Confirmed - {{tourTitle}}',
    'payment-confirmation': '✅ Payment Confirmed - {{tourTitle}}',
    'bank-transfer-instructions': '🏦 Bank Transfer Instructions - {{tourTitle}}',
    'trip-reminder': '⏰ Your Trip is Tomorrow - {{tourTitle}}',
    'trip-completion': '🌟 Thank You for Traveling with Us!',
    'booking-cancellation': '❌ Booking Cancelled - {{tourTitle}}',
    'booking-update': '📢 Booking Status Update - {{tourTitle}}',
    'welcome': '🎊 Welcome to Egypt Excursions Online!',
    'admin-booking-alert': '📋 New Booking Alert - {{tourTitle}}',
    'admin-invite': 'You’ve been invited to manage Egypt Excursions Online',
    'admin-access-update': 'Your admin access has been {{action}}'
  };

  private static async generateEmailTemplate(
    type: EmailType,
    data: Record<string, unknown>
  ): Promise<EmailTemplate> {
    try {
      const htmlTemplate = await TemplateEngine.loadTemplate(type);
      const html = TemplateEngine.replaceVariables(htmlTemplate, data);
      const subject = TemplateEngine.generateSubject(this.subjects[type], data);
      return { subject, html };
    } catch (error) {
      console.error(`Error generating email template for ${type}:`, error);
      throw error;
    }
  }

  // BOOKING CONFIRMATION
  static async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    try {
      // Generate QR code for booking verification
      const verificationUrl = generateBookingVerificationURL(data.bookingId);

      // Import the buffer generation function
      const { generateQRCodeBuffer } = await import('@/lib/utils/qrcode');
      const qrCodeBuffer = await generateQRCodeBuffer(verificationUrl, {
        width: 300,
        margin: 2,
      });

      // Add QR code CID reference to email data
      const emailData = {
        ...data,
        verificationUrl,
        qrCodeCid: 'booking-qr-code', // Content-ID for inline attachment
      };

      const template = await this.generateEmailTemplate('booking-confirmation', emailData);
      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation',
        inlineAttachments: [
          {
            filename: 'qr-code.png',
            data: qrCodeBuffer,
            cid: 'booking-qr-code'
          }
        ]
      });
    } catch (error) {
      console.error('Error sending booking confirmation with QR code:', error);
      // Fallback: send email without QR code
      const template = await this.generateEmailTemplate('booking-confirmation', data);
      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation'
      });
    }
  }

  // PAYMENT CONFIRMATION
  static async sendPaymentConfirmation(data: PaymentEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('payment-confirmation', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'payment-confirmation'
    });
  }

  // BANK TRANSFER INSTRUCTIONS
  static async sendBankTransferInstructions(data: BankTransferEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('bank-transfer-instructions', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'bank-transfer-instructions'
    });
  }

  // TRIP REMINDER (24H BEFORE)
  static async sendTripReminder(data: TripReminderData): Promise<void> {
    const template = await this.generateEmailTemplate('trip-reminder', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-reminder'
    });
  }

  // TRIP COMPLETION + REVIEW REQUEST
  static async sendTripCompletion(data: TripCompletionData): Promise<void> {
    const template = await this.generateEmailTemplate('trip-completion', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-completion'
    });
  }

  // BOOKING CANCELLATION
  static async sendCancellationConfirmation(data: CancellationData): Promise<void> {
    const template = await this.generateEmailTemplate('booking-cancellation', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-cancellation'
    });
  }

  // BOOKING STATUS UPDATE
  static async sendBookingStatusUpdate(data: BookingStatusUpdateData): Promise<void> {
    const template = await this.generateEmailTemplate('booking-update', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-update'
    });
  }

  // WELCOME EMAIL
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('welcome', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'welcome'
    });
  }

  // ADMIN BOOKING ALERT
  static async sendAdminBookingAlert(data: AdminAlertData): Promise<void> {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!adminEmail) {
      console.warn('ADMIN_NOTIFICATION_EMAIL is not set. Skipping admin notification.');
      return;
    }

    const template = await this.generateEmailTemplate('admin-booking-alert', data);
    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-booking-alert'
    });
  }

  static async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('admin-invite', data);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-invite'
    });
  }

  static async sendAdminAccessUpdateEmail(data: AdminAccessUpdateEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('admin-access-update', data);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-access-update'
    });
  }
}