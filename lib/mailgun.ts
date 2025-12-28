// lib/mailgun.ts (Final Clean Version)
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);

// Lazy initialization to avoid build-time errors when env vars are missing
let _mg: ReturnType<typeof mailgun.client> | null = null;
function getMg() {
  if (!_mg) {
    const apiKey = process.env.MAILGUN_API_KEY;
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY environment variable is not set');
    }
    _mg = mailgun.client({
      username: 'api',
      key: apiKey,
    });
  }
  return _mg;
}

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'booking@egypt-excursionsonline.com';

interface InlineAttachment {
  filename: string;
  data: Buffer;
  cid: string;
}

interface Attachment {
  filename: string;
  data: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  type: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  inlineAttachments?: InlineAttachment[];
  attachments?: Attachment[];
  // Tenant-specific sender (optional)
  fromName?: string;
  fromEmail?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Use tenant-specific from name/email if provided, otherwise fall back to defaults
    const senderName = options.fromName || 'Egypt Excursions Online';
    const senderEmail = options.fromEmail || FROM_EMAIL;
    
    const messageData: any = {
      from: `${senderName} <${senderEmail}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.cc && { cc: [options.cc] }),
      ...(options.bcc && { bcc: [options.bcc] }),
      ...(options.replyTo && { 'h:Reply-To': options.replyTo }),
      'h:X-Mailgun-Tag': options.type, // For analytics
    };

    // Add inline attachments if present (for embedded images like QR codes)
    if (options.inlineAttachments && options.inlineAttachments.length > 0) {
      // Mailgun expects inline attachments with filename matching the CID
      messageData.inline = options.inlineAttachments.map(attachment => {
        console.log(`📎 Adding inline attachment: ${attachment.cid}, size: ${attachment.data.length} bytes`);
        // The filename should match the CID for proper embedding
        return {
          filename: attachment.cid, // Use CID as filename for Mailgun inline images
          data: attachment.data,
          knownLength: attachment.data.length
        };
      });
    }

    // Add regular attachments if present (for PDFs, etc.)
    if (options.attachments && options.attachments.length > 0) {
      messageData.attachment = options.attachments.map(attachment => {
        console.log(`📄 Adding attachment: ${attachment.filename}, size: ${attachment.data.length} bytes`);
        return {
          filename: attachment.filename,
          data: attachment.data,
          knownLength: attachment.data.length,
          contentType: attachment.contentType || 'application/octet-stream'
        };
      });
    }

    console.log(`📧 Sending email with inline: ${messageData.inline?.length || 0}, attachments: ${messageData.attachment?.length || 0}`);
    const mg = getMg();
    const result = await mg.messages.create(DOMAIN, messageData);
    console.log(`📮 Mailgun response ID: ${result.id}`);

    console.log(`✅ Email sent successfully: ${options.type} to ${options.to}`);
  } catch (error) {
    console.error(`❌ Failed to send email: ${options.type}`, error);
    throw error;
  }
}

// Legacy functions for contact form and password reset
interface ContactFormData {
  name: string;
  fromEmail: string;
  message?: string;
  [key: string]: unknown;
}

export async function sendContactFormEmail(data: ContactFormData) {
  await sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL!,
    subject: `New Contact Message from ${data.name}`,
    html: generateContactFormHTML(data),
    type: 'contact-form',
    replyTo: data.fromEmail
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: generatePasswordResetHTML(resetUrl),
    type: 'password-reset'
  });
}

function generateContactFormHTML(data: ContactFormData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.fromEmail}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${data.message.replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
}

function generatePasswordResetHTML(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Password
      </a>
      <p>This link will expire in 15 minutes.</p>
    </div>
  `;
}