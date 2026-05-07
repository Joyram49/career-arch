import { logger } from '@config/logger';
import { redis } from '@config/redis';
import { Queue } from 'bullmq';

// ─────────────────────────────────────────────
// EMAIL JOB PAYLOAD TYPES
// ─────────────────────────────────────────────

export type EmailJobName =
  // ── Auth ──────────────────────────────────────────────────────────
  | 'user:verify-email'
  | 'org:verify-email'
  | 'user:password-reset'
  | 'org:password-reset'
  | 'user:password-changed'
  | 'org:password-changed'
  | 'user:2fa-enabled'
  | 'org:2fa-enabled'
  // ── Applications ──────────────────────────────────────────────────
  | 'application:submitted-user'
  | 'application:submitted-org'
  | 'application:status-update'
  // ── Subscriptions ─────────────────────────────────────────────────
  | 'subscription:activated'
  | 'subscription:cancelled'
  | 'subscription:downgraded'
  | 'subscription:payment-failed'

  // incentive
  | 'incentive:due'
  | 'incentive:paid'
  | 'incentive:overdue'
  | 'incentive:dispute-received'
  | 'incentive:waived'

  // org
  | 'org:approved'
  | 'org:rejected';

// ── Per-job payload shapes ─────────────────────────────────────────────────

export interface IUserVerifyEmailPayload {
  name: 'user:verify-email';
  to: string;
  firstName: string;
  verifyUrl: string;
}

export interface IOrgVerifyEmailPayload {
  name: 'org:verify-email';
  to: string;
  companyName: string;
  verifyUrl: string;
}

export interface IUserPasswordResetPayload {
  name: 'user:password-reset';
  to: string;
  firstName: string;
  resetUrl: string;
}

export interface IOrgPasswordResetPayload {
  name: 'org:password-reset';
  to: string;
  companyName: string;
  resetUrl: string;
}

export interface IUserPasswordChangedPayload {
  name: 'user:password-changed';
  to: string;
  firstName: string;
}

export interface IOrgPasswordChangedPayload {
  name: 'org:password-changed';
  to: string;
  companyName: string;
}

export interface IUserTwoFaEnabledPayload {
  name: 'user:2fa-enabled';
  to: string;
  firstName: string;
}

export interface IOrgTwoFaEnabledPayload {
  name: 'org:2fa-enabled';
  to: string;
  companyName: string;
}

export interface IApplicationSubmittedUserPayload {
  name: 'application:submitted-user';
  to: string;
  firstName: string;
  jobTitle: string;
  companyName: string;
  appliedDate: string;
  dashboardUrl: string;
}

export interface IApplicationSubmittedOrgPayload {
  name: 'application:submitted-org';
  to: string;
  companyName: string;
  candidateName: string;
  jobTitle: string;
  appliedDate: string;
  applicationUrl: string;
}

export interface IApplicationStatusUpdatePayload {
  name: 'application:status-update';
  to: string;
  firstName: string;
  jobTitle: string;
  companyName: string;
  status: string;
  dashboardUrl: string;
}

export interface ISubscriptionActivatedPayload {
  name: 'subscription:activated';
  to: string;
  firstName: string;
  plan: 'BASIC' | 'PREMIUM';
}

export interface ISubscriptionCancelledPayload {
  name: 'subscription:cancelled';
  to: string;
  firstName: string;
  accessUntil: string | null;
}

export interface ISubscriptionDowngradedPayload {
  name: 'subscription:downgraded';
  to: string;
  firstName: string;
}

export interface ISubscriptionPaymentFailedPayload {
  name: 'subscription:payment-failed';
  to: string;
  firstName: string;
  planName: string;
}

export interface IIncentiveDuePayload {
  name: 'incentive:due';
  orgId: string;
  applicationId: string;
  dueAt: Date;
}

export interface IIncentivePaidPayload {
  name: 'incentive:paid';
  orgId: string;
  applicationId: string;
  paidAt: Date;
}

export interface IIncentiveOverDuePayload {
  name: 'incentive:overdue';
  orgId: string;
  applicationId: string;
}

export interface IIncentiveWaivedPayload {
  name: 'incentive:waived';
  orgId: string;
  applicationId: string;
  reason: string;
}

export interface IIncentiveDisputeReceivedPayload {
  name: 'incentive:dispute-received';
  orgId: string;
  applicationId: string;
  disputeReason: string;
}

export interface IOrgApprovedPayload {
  name: 'org:approved';
  to: string;
  companyName: string;
  dashboardUrl: string;
}

export interface IOrgRejectedPayload {
  name: 'org:rejected';
  to: string;
  companyName: string;
  reason: string;
}

// ── Discriminated union — the worker pattern-matches on `name` ─────────────

export type EmailJobPayload =
  | IUserVerifyEmailPayload
  | IOrgVerifyEmailPayload
  | IUserPasswordResetPayload
  | IOrgPasswordResetPayload
  | IUserPasswordChangedPayload
  | IOrgPasswordChangedPayload
  | IUserTwoFaEnabledPayload
  | IOrgTwoFaEnabledPayload
  | IApplicationSubmittedUserPayload
  | IApplicationSubmittedOrgPayload
  | IApplicationStatusUpdatePayload
  | ISubscriptionActivatedPayload
  | ISubscriptionCancelledPayload
  | ISubscriptionDowngradedPayload
  | ISubscriptionPaymentFailedPayload
  | IIncentiveDuePayload
  | IIncentivePaidPayload
  | IIncentiveOverDuePayload
  | IIncentiveDisputeReceivedPayload
  | IIncentiveWaivedPayload
  | IOrgApprovedPayload
  | IOrgRejectedPayload;

// ─────────────────────────────────────────────
// QUEUE INSTANCE
// ─────────────────────────────────────────────

export const EMAIL_QUEUE_NAME = 'emails';

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000, // 3s → 9s → 27s
    },
    removeOnComplete: { count: 100 }, // keep last 100 completed jobs for inspection
    removeOnFail: { count: 200 }, // keep last 200 failed jobs for debugging
  },
});

emailQueue.on('error', (err) => {
  logger.error('Email queue error:', err);
});

// ─────────────────────────────────────────────
// TYPED ENQUEUE HELPER
// ─────────────────────────────────────────────

/**
 * Enqueue an email job. Fire-and-forget — never throws.
 * Failures are logged; they never propagate to the caller.
 *
 * @example
 * void enqueueEmail({
 *   name: 'user:verify-email',
 *   to: user.email,
 *   firstName: 'Jane',
 *   verifyUrl: 'https://...',
 * });
 */

export function hasRecipient(
  payload: EmailJobPayload,
): payload is Extract<EmailJobPayload, { to: string }> {
  return 'to' in payload && typeof payload.to === 'string';
}
export function enqueueEmail(payload: EmailJobPayload): void {
  emailQueue.add(payload.name, payload).catch((err: unknown) => {
    if (hasRecipient(payload)) {
      logger.error(`Failed to enqueue email "${payload.name}" to ${payload.to}:`, err);
    } else {
      logger.error(`Failed to enqueue email "${payload.name}":`, err);
    }
  });
}
