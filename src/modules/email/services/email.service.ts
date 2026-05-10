/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs';
import path from 'path';

import { type IEmailJobData } from '@app-types/email.types';
import { sendTransactionalMail } from '@config/email';
import { env } from '@config/env';
import { logger } from '@config/logger';

import { prisma } from '@/config/database';

import type { SubscriptionPlan } from '@prisma/client';

// ─────────────────────────────────────────────
// TEMPLATE LOADER
// ─────────────────────────────────────────────

function loadTemplate(
  templateName: string,
  variables: Record<string, string | number | boolean>,
): string {
  const candidatePaths = [
    // Preferred in compiled/runtime environments (dist/modules/email/services -> ../templates).
    path.resolve(__dirname, '..', 'templates', `${templateName}.html`),
    // Fallback for source execution (ts-node / local dev).
    path.join(process.cwd(), 'src', 'modules', 'email', 'templates', `${templateName}.html`),
    // Fallback for compiled execution launched from project root.
    path.join(process.cwd(), 'dist', 'modules', 'email', 'templates', `${templateName}.html`),
  ];

  const templatePath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (templatePath === undefined) {
    throw new Error(
      `Email template "${templateName}.html" not found. Checked: ${candidatePaths.join(', ')}`,
    );
  }

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

    await sendTransactionalMail({
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

// status helper
function getStatusMessage(
  status: string,
  jobTitle: string,
  companyName: string,
  firstName: string,
): string {
  switch (status) {
    case 'UNDER_REVIEW':
      return `Your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> is currently under review. The hiring team is evaluating your profile.`;

    case 'SHORTLISTED':
      return `Great news, ${firstName}! 🎉 You’ve been shortlisted for the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>. The employer is interested in moving forward with your application.`;

    case 'INTERVIEW_SCHEDULED':
      return `Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has progressed to the interview stage. Please check your dashboard for interview details and next steps.`;

    case 'OFFERED':
      return `Congratulations! 🏆 You’ve received an offer for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>. Review the offer details and take your next step from your dashboard.`;

    case 'HIRED':
      return `Amazing news, ${firstName}! 🎊 You’ve been successfully hired for the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>. Wishing you great success in your new journey!`;

    case 'REJECTED':
      return `We appreciate your interest in the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>. Unfortunately, the employer has decided to move forward with other candidates this time. Keep applying — the right opportunity is ahead.`;

    default:
      return `There has been an update regarding your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.`;
  }
}

export async function sendApplicationStatusUpdateEmail(
  email: string,
  firstName: string,
  jobTitle: string,
  companyName: string,
  status: string,
  dashboardUrl: string,
): Promise<void> {
  const subjectMap: Record<string, string> = {
    UNDER_REVIEW: `🔍 Your application is under review — ${jobTitle}`,
    SHORTLISTED: `🎉 You've been shortlisted — ${jobTitle} at ${companyName}`,
    INTERVIEW_SCHEDULED: `📅 Interview scheduled — ${jobTitle} at ${companyName}`,
    OFFERED: `🏆 You've received an offer — ${jobTitle} at ${companyName}`,
    HIRED: `🎊 Congratulations, you're hired! — ${jobTitle}`,
    REJECTED: `Application update — ${jobTitle} at ${companyName}`,
  };

  const statusClassMap: Record<string, string> = {
    UNDER_REVIEW: 'status-info',
    SHORTLISTED: 'status-success',
    INTERVIEW_SCHEDULED: 'status-warning',
    OFFERED: 'status-success',
    HIRED: 'status-success',
    REJECTED: 'status-danger',
  };

  const statusLabelMap: Record<string, string> = {
    UNDER_REVIEW: '🔍 Under Review',
    SHORTLISTED: '🎉 Shortlisted',
    INTERVIEW_SCHEDULED: '📅 Interview Scheduled',
    OFFERED: '🏆 Offer Received',
    HIRED: '🎊 Hired',
    REJECTED: '❌ Not Selected',
  };

  const subject = subjectMap[status] ?? `Application update — ${jobTitle}`;

  const statusMessage = getStatusMessage(status, jobTitle, companyName, firstName);

  await sendEmail({
    to: email,
    subject,
    template: 'application-status-update',
    variables: {
      FIRST_NAME: firstName,
      JOB_TITLE: jobTitle,
      COMPANY_NAME: companyName,
      STATUS: statusLabelMap[status] ?? status,
      STATUS_MESSAGE: statusMessage,
      STATUS_CLASS: statusClassMap[status] ?? 'status-info',
      DASHBOARD_URL: dashboardUrl,
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

// ─────────────────────────────────────────────
// INCENTIVE EMAILS
// ─────────────────────────────────────────────

/**
 * Shared helper — loads org email + profile and application relations.
 * Avoids repeating the same two parallel queries in every incentive sender.
 */
async function loadIncentiveEmailData(
  orgId: string,
  applicationId: string,
): Promise<{
  orgEmail: string;
  companyName: string;
  candidateName: string;
  jobTitle: string;
} | null> {
  const [org, application] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { email: true, profile: { select: { companyName: true } } },
    }),
    prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { include: { profile: { select: { firstName: true, lastName: true } } } },
        job: { select: { title: true } },
      },
    }),
  ]);

  if (org === null || application === null) return null;

  return {
    orgEmail: org.email,
    companyName: org.profile?.companyName ?? 'Your Company',
    candidateName:
      `${application.user.profile?.firstName ?? ''} ${application.user.profile?.lastName ?? ''}`.trim(),
    jobTitle: application.job.title,
  };
}

export async function sendIncentiveDueEmail(
  orgId: string,
  applicationId: string,
  dueAt: Date,
): Promise<void> {
  const data = await loadIncentiveEmailData(orgId, applicationId);
  if (data === null) return;

  const dueDate = dueAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await sendEmail({
    to: data.orgEmail,
    subject: `🎉 You hired ${data.candidateName} — $50 incentive due by ${dueDate}`,
    template: 'incentive-due',
    variables: {
      COMPANY_NAME: data.companyName,
      CANDIDATE_NAME: data.candidateName,
      JOB_TITLE: data.jobTitle,
      AMOUNT: '50.00',
      DUE_DATE: dueDate,
      PAY_URL: `${env.FRONTEND_URL}/org/incentives`,
    },
  });
}

export async function sendIncentivePaidEmail(
  orgId: string,
  applicationId: string,
  paidAt: Date,
): Promise<void> {
  const data = await loadIncentiveEmailData(orgId, applicationId);
  if (data === null) return;

  const paidDate = paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await sendEmail({
    to: data.orgEmail,
    subject: '✅ Payment confirmed — hiring incentive receipt',
    template: 'incentive-paid',
    variables: {
      COMPANY_NAME: data.companyName,
      CANDIDATE_NAME: data.candidateName,
      JOB_TITLE: data.jobTitle,
      AMOUNT: '50.00',
      PAID_DATE: paidDate,
      RECEIPT_URL: `${env.FRONTEND_URL}/org/incentives`,
    },
  });
}

export async function sendIncentiveOverdueEmail(
  orgId: string,
  applicationId: string,
): Promise<void> {
  const data = await loadIncentiveEmailData(orgId, applicationId);
  if (data === null) return;

  // Fetch dueAt from the incentive record directly
  const incentive = await prisma.hiringIncentive.findUnique({
    where: { applicationId },
    select: { dueAt: true },
  });

  const dueDate =
    incentive?.dueAt != null
      ? incentive.dueAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';

  await sendEmail({
    to: data.orgEmail,
    subject: '⚠️ Action required — hiring incentive payment overdue',
    template: 'incentive-overdue',
    variables: {
      COMPANY_NAME: data.companyName,
      CANDIDATE_NAME: data.candidateName,
      JOB_TITLE: data.jobTitle,
      AMOUNT: '50.00',
      DUE_DATE: dueDate,
      PAY_URL: `${env.FRONTEND_URL}/org/incentives`,
    },
  });
}

export async function sendIncentiveWaivedEmail(
  orgId: string,
  applicationId: string,
  reason: string,
): Promise<void> {
  const data = await loadIncentiveEmailData(orgId, applicationId);
  if (data === null) return;

  await sendEmail({
    to: data.orgEmail,
    subject: '✅ Hiring incentive waived — no payment required',
    template: 'incentive-waived',
    variables: {
      COMPANY_NAME: data.companyName,
      CANDIDATE_NAME: data.candidateName,
      JOB_TITLE: data.jobTitle,
      AMOUNT: '50.00',
      REASON: reason,
    },
  });
}

export async function sendIncentiveDisputeReceivedEmail(
  orgId: string,
  applicationId: string,
  disputeReason: string,
): Promise<void> {
  const data = await loadIncentiveEmailData(orgId, applicationId);
  if (data === null) return;

  await sendEmail({
    to: data.orgEmail,
    subject: '📋 Dispute received — we will review within 2 business days',
    template: 'incentive-dispute-received',
    variables: {
      COMPANY_NAME: data.companyName,
      CANDIDATE_NAME: data.candidateName,
      JOB_TITLE: data.jobTitle,
      AMOUNT: '50.00',
      DISPUTE_REASON: disputeReason,
    },
  });
}

export async function sendOrgApprovedEmail(
  email: string,
  companyName: string,
  dashboardUrl: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🎉 Your organization has been approved — start posting jobs!',
    template: 'org-approved',
    variables: {
      COMPANY_NAME: companyName,
      DASHBOARD_URL: dashboardUrl,
    },
  });
}

export async function sendOrgRejectedEmail(
  email: string,
  companyName: string,
  reason: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your organization registration was rejected',
    template: 'org-rejected',
    variables: {
      COMPANY_NAME: companyName,
      REASON: reason,
      SUPPORT_EMAIL: env.MAIL_FROM_ADDRESS,
    },
  });
}
