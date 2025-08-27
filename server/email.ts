import { MailService } from '@sendgrid/mail';
import nodemailer from 'nodemailer';

let mailService: MailService | null = null;
let smtpTransporter: nodemailer.Transporter | null = null;

// Try SendGrid first
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  try {
    mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid email service initialized');
  } catch (error) {
    console.warn('⚠️ SendGrid initialization failed:', error);
  }
}
// Try SMTP configuration as fallback
else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ SMTP email service initialized');
  } catch (error) {
    console.warn('⚠️ SMTP initialization failed:', error);
  }
}
// Gmail SMTP as another option
else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  try {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    });
    
    // Test the connection
    smtpTransporter.verify(function(error: any, success: any) {
      if (error) {
        console.error('❌ Gmail SMTP verification failed:', error);
      } else {
        console.log('✅ Gmail SMTP server is ready to take our messages');
      }
    });
    
    console.log('✅ Gmail SMTP service initialized');
  } catch (error) {
    console.warn('⚠️ Gmail SMTP initialization failed:', error);
  }
} else {
  console.log('ℹ️ No email service configured - email features disabled');
  console.log('ℹ️ Configure either SendGrid (SENDGRID_API_KEY) or SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or Gmail (GMAIL_USER, GMAIL_APP_PASSWORD)');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Try SendGrid first
  if (mailService) {
    try {
      await mailService.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text ?? '',
        html: params.html,
      });
      console.log('✅ Email sent via SendGrid to:', params.to);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email error:', error);
      return false;
    }
  }
  
  // Try SMTP as fallback
  if (smtpTransporter) {
    try {
      console.log('📤 Attempting to send email via SMTP to:', params.to);
      const result = await smtpTransporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      console.log('✅ Email sent via SMTP to:', params.to);
      console.log('📧 Email result:', result);
      return true;
    } catch (error) {
      console.error('❌ SMTP email error:', error);
      console.error('❌ SMTP error details:', {
        code: (error as any).code,
        command: (error as any).command,
        response: (error as any).response,
        responseCode: (error as any).responseCode
      });
      return false;
    }
  }

  console.log('⚠️ Email not configured - would send:', {
    to: params.to,
    subject: params.subject,
    from: params.from
  });
  return false;
}

export function isEmailConfigured(): boolean {
  return !!(mailService || smtpTransporter);
}