/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs';
import path from 'path';

import { type IEmailJobData } from '@app-types/email.types';
import { defaultMailOptions, transporter } from '@config/email';
import { env } from '@config/env';
import { logger } from '@config/logger';

import type { SubscriptionPlan } from '@prisma/client';

// ─────────────────────────────────────────────
// TEMPLATE LOADER
// ─────────────────────────────────────────────

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

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
  });

  // Common globals
  html = html.replace(/{{APP_NAME}}/g, 'CareerArch');
  html = html.replace(/{{APP_URL}}/g, env.FRONTEND_URL);
  html = html.replace(/{{SUPPORT_EMAIL}}/g, env.MAIL_FROM_ADDRESS);
  html = html.replace(/{{YEAR}}/g, new Date().getFullYear().toString());

  return html;
}

// ─────────────────────────────────────────────
// CORE SEND
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// AUTH EMAILS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// APPLICATION EMAILS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// SUBSCRIPTION EMAILS
// ─────────────────────────────────────────────

// Plan display helpers
const PLAN_PRICES: Record<string, string> = {
  BASIC: '$9.99',
  PREMIUM: '$24.99',
};

const PLAN_FEATURES_TEXT: Record<string, string[]> = {
  BASIC: [
    'Apply to up to 30 jobs per month',
    'Save up to 50 jobs',
    'View full company profiles',
    'Early job alert emails',
  ],
  PREMIUM: [
    'Unlimited job applications',
    'Unlimited saved jobs',
    'Priority placement in org search',
    'AI-powered resume tips',
  ],
};

export async function sendSubscriptionActivatedEmail(
  email: string,
  firstName: string,
  plan: SubscriptionPlan,
): Promise<void> {
  const planName = plan === 'BASIC' ? 'Basic' : 'Premium';
  const features = PLAN_FEATURES_TEXT[plan] ?? [];
  const renewDate = new Date();
  renewDate.setMonth(renewDate.getMonth() + 1);

  await sendEmail({
    to: email,
    subject: `🎉 Welcome to CareerArch ${planName}!`,
    template: 'subscription-activated',
    variables: {
      FIRST_NAME: firstName,
      PLAN_NAME: planName,
      PLAN_PRICE: PLAN_PRICES[plan] ?? '',
      RENEW_DATE: renewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      FEATURE_1: features[0] ?? '',
      FEATURE_2: features[1] ?? '',
      FEATURE_3: features[2] ?? '',
      FEATURE_4: features[3] ?? '',
      DASHBOARD_URL: `${env.FRONTEND_URL}/dashboard/user`,
    },
  });
}

export async function sendSubscriptionCancelledEmail(
  email: string,
  firstName: string,
  accessUntil: Date | null,
): Promise<void> {
  const accessUntilStr = accessUntil
    ? accessUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'the end of your billing period';

  await sendEmail({
    to: email,
    subject: 'Your CareerArch subscription has been cancelled',
    template: 'subscription-cancelled',
    variables: {
      FIRST_NAME: firstName,
      PLAN_NAME: 'your current plan',
      ACCESS_UNTIL: accessUntilStr,
      DASHBOARD_URL: `${env.FRONTEND_URL}/dashboard/user`,
    },
  });
}

export async function sendSubscriptionDowngradedEmail(
  email: string,
  firstName: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your CareerArch account has been downgraded to Free',
    template: 'subscription-downgraded',
    variables: {
      FIRST_NAME: firstName,
      PLANS_URL: `${env.FRONTEND_URL}/subscription/plans`,
    },
  });
}

export async function sendPaymentFailedEmail(
  email: string,
  firstName: string,
  planName: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '⚠️ Payment failed — action required',
    template: 'payment-failed',
    variables: {
      FIRST_NAME: firstName,
      PLAN_NAME: planName,
      UPDATE_PAYMENT_URL: `${env.FRONTEND_URL}/dashboard/user/subscription`,
    },
  });
}
