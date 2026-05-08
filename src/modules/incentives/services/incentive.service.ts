/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { env } from '@config/env';
import { stripe } from '@config/stripe';
import { type Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { INCENTIVE } from '@shared/utils/constants';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { logger } from '@/config/logger';
import { emitIncentiveCreated } from '@/config/socket';
import { enqueueEmail } from '@/jobs/queues/email.queue';

import { incentiveInclude, mapIncentive, syncOrgIncentiveFlag } from '../helpers';
import { type IIncentiveResponse } from '../types';

import type { ListOrgIncentivesQuery } from '@modules/incentives/validations/incentive.validation';

// ─────────────────────────────────────────────
// AUTO-CREATE ON HIRE (called from application service)
// ─────────────────────────────────────────────

/**
 * Creates a HiringIncentive when an application is marked HIRED.
 * Also sets org.hasUnpaidIncentives = true and sends the due email.
 *
 * Idempotent — Prisma unique constraint on applicationId prevents duplicates.
 */
export async function createIncentiveForHire(
  orgId: string,
  jobId: string,
  applicationId: string,
  candidateName: string,
  jobTitle: string,
): Promise<void> {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + INCENTIVE.PAYMENT_WINDOW_DAYS);

  // amount stored as dollars in DB ($50.00), Stripe receives cents
  const amountDollars = INCENTIVE.AMOUNT_CENTS / 100;

  const [incentive, _updatedOrg] = await prisma.$transaction([
    prisma.hiringIncentive.create({
      data: {
        orgId,
        jobId,
        applicationId,
        amount: amountDollars,
        currency: env.STRIPE_CURRENCY.toUpperCase(),
        status: 'PENDING',
        dueAt,
      },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { hasUnpaidIncentives: true },
    }),
  ]);

  // Fire-and-forget email — never fail the main request
  enqueueEmail({
    name: 'incentive:due',
    orgId,
    applicationId: incentive.id,
    dueAt,
  });

  // Emit real-time alert to org
  emitIncentiveCreated(orgId, {
    incentiveId: incentive.id,
    amount: 50,
    candidateName,
    jobTitle,
    dueAt,
  });

  // Create in-DB notification for org
  await prisma.notification.create({
    data: {
      orgId,
      recipientRole: 'ORGANIZATION',
      title: 'Hiring Incentive Due 💰',
      message: `$50 incentive due for hiring ${candidateName} — pay within 7 days`,
      link: `/org/incentives`,
    },
  });
}

// ─────────────────────────────────────────────
// ORG — LIST OWN INCENTIVES
// ─────────────────────────────────────────────

export async function listOrgIncentives(
  orgId: string,
  query: ListOrgIncentivesQuery,
): Promise<{
  incentives: IIncentiveResponse[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.HiringIncentiveWhereInput = {
    orgId,
    ...(query.status !== undefined && { status: query.status }),
  };

  const direction: Prisma.SortOrder = query.sortOrder;
  const orderBy: Prisma.HiringIncentiveOrderByWithRelationInput =
    query.sortBy === 'dueAt'
      ? { dueAt: direction }
      : query.sortBy === 'paidAt'
        ? { paidAt: direction }
        : { createdAt: direction };

  const [rows, total] = await Promise.all([
    prisma.hiringIncentive.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: incentiveInclude(),
    }),
    prisma.hiringIncentive.count({ where }),
  ]);

  return {
    incentives: rows.map(mapIncentive),
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// ORG — GET SINGLE INCENTIVE
// ─────────────────────────────────────────────

export async function getOrgIncentive(orgId: string, id: string): Promise<IIncentiveResponse> {
  const incentive = await prisma.hiringIncentive.findFirst({
    where: { id, orgId },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  return mapIncentive(incentive);
}

// ─────────────────────────────────────────────
// ORG — PAY INCENTIVE (Stripe PaymentIntent off-session)
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function payIncentive(
  orgId: string,
  id: string,
): Promise<{ incentive: IIncentiveResponse; receiptUrl: string | null }> {
  // 1. Load incentive and verify ownership
  const incentive = await prisma.hiringIncentive.findFirst({
    where: { id, orgId },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  // 2. Status guards
  if (incentive.status === 'PAID') {
    throw new BadRequestError('This incentive has already been paid');
  }
  if (incentive.status === 'WAIVED') {
    throw new BadRequestError('This incentive has been waived — no payment required');
  }
  if (incentive.status === 'DISPUTED') {
    throw new BadRequestError('This incentive is under dispute. Please wait for admin resolution.');
  }
  // PENDING and OVERDUE are both payable

  // 3. Load org payment details
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  if (org === null) throw new NotFoundError('Organization not found');

  if (org.stripeDefaultPaymentMethodId === null || org.stripeDefaultPaymentMethodId === undefined) {
    throw new BadRequestError(
      'No payment method on file. Please add a card at /org/billing before paying.',
    );
  }

  if (org.stripeCustomerId === null || org.stripeCustomerId === undefined) {
    throw new BadRequestError('Stripe customer not found. Please contact support.');
  }

  // 4. Create and confirm PaymentIntent (off-session — org not present)
  const amountCents = Math.round(incentive.amount * 100);

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: incentive.currency.toLowerCase(),
      customer: org.stripeCustomerId,
      payment_method: org.stripeDefaultPaymentMethodId,
      confirm: true,
      off_session: true,
      return_url: `${env.FRONTEND_URL}/org/incentives`,
      metadata: {
        type: 'INCENTIVE',
        orgId: incentive.orgId,
        incentiveId: incentive.id,
        applicationId: incentive.applicationId,
        jobId: incentive.jobId,
        platform: 'CareerArch',
      },
    });
  } catch (err: unknown) {
    const stripeErr = err as { code?: string; message?: string; type?: string };

    logger.error('Stripe PaymentIntent failed for incentive:', {
      incentiveId: id,
      orgId,
      error: stripeErr,
    });

    const userMessage =
      stripeErr.code === 'card_declined'
        ? 'Your card was declined. Please update your payment method and try again.'
        : stripeErr.code === 'insufficient_funds'
          ? 'Your card has insufficient funds. Please update your payment method.'
          : stripeErr.code === 'authentication_required'
            ? 'Your card requires authentication. Please update your payment method.'
            : `Payment failed: ${stripeErr.message ?? 'Unknown error'}. Please try again or update your payment method.`;

    throw new BadRequestError(userMessage);
  }

  // 5. PaymentIntent confirmed — update DB
  const now = new Date();

  await prisma.$transaction([
    prisma.hiringIncentive.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: now,
        stripePaymentIntentId: paymentIntent.id,
      },
    }),
    prisma.payment.create({
      data: {
        orgId,
        type: 'INCENTIVE',
        amount: incentive.amount,
        currency: incentive.currency,
        status: 'SUCCEEDED',
        stripePaymentIntentId: paymentIntent.id,
        description:
          `Hiring incentive — ${incentive.job.title ?? 'Job'} (${incentive.application.user.profile?.firstName ?? ''} ${incentive.application.user.profile?.lastName ?? ''})`.trim(),
      },
    }),
  ]);

  // 6. Recalculate org flag
  await syncOrgIncentiveFlag(orgId);

  // 7. Fetch updated incentive for response
  const updated = await prisma.hiringIncentive.findFirst({
    where: { id },
    include: incentiveInclude(),
  });

  if (updated === null) throw new NotFoundError('Incentive not found after update');

  // 8. Send receipt email (fire-and-forget)
  enqueueEmail({
    name: 'incentive:paid',
    orgId,
    applicationId: updated.applicationId,
    paidAt: updated.paidAt ?? new Date(),
  });

  // Extract receipt URL from Stripe charges if available
  const receiptUrl = typeof paymentIntent.latest_charge === 'string' ? null : null; // receipt_url available on charge object; omit for simplicity

  return { incentive: mapIncentive(updated), receiptUrl };
}

// ─────────────────────────────────────────────
// ORG — DISPUTE INCENTIVE
// ─────────────────────────────────────────────

export async function disputeIncentive(
  orgId: string,
  id: string,
  reason: string,
): Promise<{ message: string }> {
  const incentive = await prisma.hiringIncentive.findFirst({
    where: { id, orgId },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  if (incentive.status === 'PAID') {
    throw new BadRequestError('Paid incentives cannot be disputed');
  }
  if (incentive.status === 'WAIVED') {
    throw new BadRequestError('Waived incentives cannot be disputed');
  }
  if (incentive.status === 'DISPUTED') {
    throw new BadRequestError('This incentive is already under dispute');
  }

  await prisma.hiringIncentive.update({
    where: { id },
    data: { status: 'DISPUTED' },
  });

  // Create admin notification
  await prisma.notification.create({
    data: {
      recipientRole: 'ADMIN',
      title: 'Incentive Dispute Filed',
      message: `Organization ${orgId} has disputed incentive ${id}. Reason: ${reason}`,
      link: `/admin/incentives/${id}`,
    },
  });

  // Fire-and-forget emails
  enqueueEmail({
    name: 'incentive:dispute-received',
    orgId,
    applicationId: incentive.applicationId,
    disputeReason: reason,
  });

  return {
    message: 'Dispute filed successfully. Our team will review within 2 business days.',
  };
}
