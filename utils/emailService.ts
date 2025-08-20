// Use the centralized email service from server/email.ts
import { sendEmail as serverSendEmail } from '../server/email';
import { EmailTemplate } from './emailNotifications';

export interface SendEmailOptions {
  to: string;
  from: string;
  template: EmailTemplate;
}

/**
 * Send email using Gmail SMTP with ICS attachment support
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    // Use the server email service that supports Gmail SMTP
    const success = await serverSendEmail({
      to: options.to,
      from: options.from,
      subject: options.template.subject,
      text: options.template.text,
      html: options.template.html,
    });
    
    if (success) {
      console.log(`📧 Email sent successfully to ${options.to}`);
    } else {
      console.log(`❌ Failed to send email to ${options.to}`);
    }
    
    return success;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

/**
 * Get default from email address
 */
export function getDefaultFromEmail(): string {
  return process.env.GMAIL_USER || process.env.FROM_EMAIL || 'noreply@scheduler-lite.com';
}