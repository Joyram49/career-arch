import nodemailer from 'nodemailer';

import { env } from './env';
import { logger } from './logger';

const BREVO_TX_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account';

function brevoHttpApiKey(): string | undefined {
  const raw = env.BREVO_API_KEY;
  const trimmed = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
  return trimmed;
}

const smtpCreds = (() => {
  if (brevoHttpApiKey() !== undefined) return null;

  const user = env.BREVO_SMTP_USER?.trim() ?? '';
  const pass = env.BREVO_SMTP_KEY?.trim() ?? '';
  if (user.length === 0 || pass.length === 0) return null;

  return { user, pass };
})();

export const transporter = smtpCreds
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: smtpCreds,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    })
  : null;

export const defaultMailOptions = {
  from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
} as const;

export async function sendTransactionalMail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = brevoHttpApiKey();

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- branching on credential mode, not branching on secret value
  if (apiKey) {
    const response = await fetch(BREVO_TX_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_ADDRESS },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo transactional API ${response.status}: ${body}`);
    }
    return;
  }

  if (transporter === null) {
    throw new Error('Email transport is not configured (no Brevo API key or SMTP credentials)');
  }

  await transporter.sendMail({
    ...defaultMailOptions,
    ...payload,
  });
}

export async function verifyEmailConnection(): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  try {
    const apiKey = brevoHttpApiKey();

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- branching on credential mode
    if (apiKey) {
      const response = await fetch(BREVO_ACCOUNT_URL, {
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo API account check failed (${response.status}): ${body}`);
      }

      logger.info('✅ Email (Brevo HTTPS API) transport ready');
      return;
    }

    if (transporter !== null) {
      await transporter.verify();
      logger.info('✅ Email (Brevo SMTP) transport ready');
    }
  } catch (error) {
    logger.error('❌ Email transport failed:', error);
  }
}
