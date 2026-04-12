/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs';
import path from 'path';

import { defaultMailOptions, transporter } from '@config/email';
import { env } from '@config/env';
import { logger } from '@config/logger';

import type { IEmailJobData } from '@app-types/index';

/**
 * Load and populate an HTML email template
 */

function loadTemplate(
  templateName: string,
  variables: Record<string, string | number | boolean>,
): string {
  const basePath =
    process.env['NODE_ENV'] === 'production'
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'src');
  const templatePath = path.join(basePath, 'templates', 'emails', `${templateName}.html`);

  let html = fs.readFileSync(templatePath, 'utf-8');

  // Replace all {{VARIABLE}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
  });

  // Replace common globals
  html = html.replace(/{{APP_NAME}}/g, 'CareerArch');
  html = html.replace(/{{APP_URL}}/g, env.FRONTEND_URL);
  html = html.replace(/{{SUPPORT_EMAIL}}/g, env.MAIL_FROM_ADDRESS);
  html = html.replace(/{{YEAR}}/g, new Date().getFullYear().toString());

  return html;
}

/**
 * Core send function
 */
export async function sendEmail(data: IEmailJobData): Promise<void> {
  try {
    const html = loadTemplate(data.template, data.variables);

    await transporter.sendMail({
      ...defaultMailOptions,
      to: data.to,
      subject: data.subject,
      html,
    });

    logger.info(`Email sent: "${data.subject}" → ${data.to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${data.to}:`, error);
    throw error;
  }
}

// ── Specific email senders ─────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verifyUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '✅ Verify your CareerArch email address',
    template: 'verify-email',
    variables: { FIRST_NAME: firstName, VERIFY_URL: verifyUrl },
  });
}

export async function sendOrgVerificationEmail(
  email: string,
  companyName: string,
  verifyUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '✅ Verify your CareerArch organization email',
    template: 'verify-email-org',
    variables: { COMPANY_NAME: companyName, VERIFY_URL: verifyUrl },
  });
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🔑 Reset your CareerArch password',
    template: 'reset-password',
    variables: { FIRST_NAME: firstName, RESET_URL: resetUrl },
  });
}

export async function sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🔒 Your CareerArch password was changed',
    template: 'password-changed',
    variables: { FIRST_NAME: firstName },
  });
}

export async function sendTwoFaEnabledEmail(email: string, firstName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🛡️ Two-factor authentication enabled',
    template: '2fa-enabled',
    variables: { FIRST_NAME: firstName },
  });
}

export async function sendApplicationConfirmationUser(
  email: string,
  firstName: string,
  jobTitle: string,
  companyName: string,
  dashboardUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `✅ Application submitted — ${jobTitle} at ${companyName}`,
    template: 'application-submitted-user',
    variables: {
      FIRST_NAME: firstName,
      JOB_TITLE: jobTitle,
      COMPANY_NAME: companyName,
      APPLIED_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      DASHBOARD_URL: dashboardUrl,
    },
  });
}

export async function sendApplicationReceivedOrg(
  email: string,
  companyName: string,
  candidateName: string,
  jobTitle: string,
  applicationUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `📩 New application — ${jobTitle} from ${candidateName}`,
    template: 'application-submitted-org',
    variables: {
      COMPANY_NAME: companyName,
      CANDIDATE_NAME: candidateName,
      JOB_TITLE: jobTitle,
      APPLIED_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      APPLICATION_URL: applicationUrl,
    },
  });
}
