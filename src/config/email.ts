import nodemailer from 'nodemailer';

import { env } from './env';
import { logger } from './logger';

export const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: env.SENDGRID_API_KEY,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

export async function verifyEmailConnection(): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  try {
    await transporter.verify();
    logger.info('✅ Email (SendGrid) transport ready');
  } catch (error) {
    logger.error('❌ Email transport failed:', error);
  }
}

export interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const defaultMailOptions = {
  from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
} as const;
