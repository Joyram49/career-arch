import { logger } from '@config/logger';
import { redis } from '@config/redis';
import { EMAIL_QUEUE_NAME, type EmailJobPayload } from '@jobs/queues/email.queue';
import {
  sendApplicationConfirmationUser,
  sendApplicationReceivedOrg,
  sendApplicationStatusUpdateEmail,
  sendOrgVerificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendPaymentFailedEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionDowngradedEmail,
  sendTwoFaEnabledEmail,
  sendVerificationEmail,
} from '@services/email.service';
import { Worker, type Job } from 'bullmq';

// ─────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────

export const emailWorker = new Worker<EmailJobPayload>(
  EMAIL_QUEUE_NAME,
  // eslint-disable-next-line complexity
  async (job: Job<EmailJobPayload>): Promise<void> => {
    const payload = job.data;

    logger.info(`[EmailWorker] Processing job "${payload.name}" → ${payload.to}`);

    switch (payload.name) {
      // ── Auth ────────────────────────────────────────────────────────────

      case 'user:verify-email':
        await sendVerificationEmail(payload.to, payload.firstName, payload.verifyUrl);
        break;

      case 'org:verify-email':
        await sendOrgVerificationEmail(payload.to, payload.companyName, payload.verifyUrl);
        break;

      case 'user:password-reset':
        await sendPasswordResetEmail(payload.to, payload.firstName, payload.resetUrl);
        break;

      case 'org:password-reset':
        // org password reset reuses the same template — companyName fills the FIRST_NAME slot
        await sendPasswordResetEmail(payload.to, payload.companyName, payload.resetUrl);
        break;

      case 'user:password-changed':
        await sendPasswordChangedEmail(payload.to, payload.firstName);
        break;

      case 'org:password-changed':
        await sendPasswordChangedEmail(payload.to, payload.companyName);
        break;

      case 'user:2fa-enabled':
        await sendTwoFaEnabledEmail(payload.to, payload.firstName);
        break;

      case 'org:2fa-enabled':
        await sendTwoFaEnabledEmail(payload.to, payload.companyName);
        break;

      // ── Applications ─────────────────────────────────────────────────────

      case 'application:submitted-user':
        await sendApplicationConfirmationUser(
          payload.to,
          payload.firstName,
          payload.jobTitle,
          payload.companyName,
          payload.dashboardUrl,
        );
        break;

      case 'application:submitted-org':
        await sendApplicationReceivedOrg(
          payload.to,
          payload.companyName,
          payload.candidateName,
          payload.jobTitle,
          payload.applicationUrl,
        );
        break;

      case 'application:status-update':
        await sendApplicationStatusUpdateEmail(
          payload.to,
          payload.firstName,
          payload.jobTitle,
          payload.companyName,
          payload.status,
          payload.dashboardUrl,
        );
        break;

      // ── Subscriptions ─────────────────────────────────────────────────────

      case 'subscription:activated':
        await sendSubscriptionActivatedEmail(payload.to, payload.firstName, payload.plan);
        break;

      case 'subscription:cancelled':
        await sendSubscriptionCancelledEmail(
          payload.to,
          payload.firstName,
          payload.accessUntil !== null ? new Date(payload.accessUntil) : null,
        );
        break;

      case 'subscription:downgraded':
        await sendSubscriptionDowngradedEmail(payload.to, payload.firstName);
        break;

      case 'subscription:payment-failed':
        await sendPaymentFailedEmail(payload.to, payload.firstName, payload.planName);
        break;

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = payload;
        logger.warn(`[EmailWorker] Unknown job name: ${JSON.stringify(_exhaustive)}`);
      }
    }

    logger.info(`[EmailWorker] Completed job "${payload.name}" → ${payload.to}`);
  },
  {
    connection: redis,
    concurrency: 5, // process up to 5 emails simultaneously
  },
);

// ─────────────────────────────────────────────
// WORKER EVENTS
// ─────────────────────────────────────────────

emailWorker.on('completed', (job) => {
  logger.info(`[EmailWorker] Job ${job.id} (${job.name}) completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(
    `[EmailWorker] Job ${job?.id} (${job?.name}) failed after ${job?.attemptsMade} attempts:`,
    err,
  );
});

emailWorker.on('error', (err) => {
  logger.error('[EmailWorker] Worker error:', err);
});
