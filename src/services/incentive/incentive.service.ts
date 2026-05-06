/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { env } from '@config/env';
import { stripe } from '@config/stripe';
import { BadRequestError, NotFoundError } from '@utils/apiError';
import { INCENTIVE } from '@utils/constants';
import { buildPaginationMeta } from '@utils/pagination';
import { extractPagination } from '@utils/queryBuilder';

import { logger } from '@/config/logger';
import { emitIncentiveCreated } from '@/config/socket';
import { enqueueEmail } from '@/jobs/queues/email.queue';
import type {
  AdminListIncentivesQuery,
  ListOrgIncentivesQuery,
} from '@/validations/incentive.validation';

import type { IncentiveStatus, Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────

export interface IIncentiveResponse {
  id: string;
  orgId: string;
  jobId: string;
  applicationId: string;
  amount: number;
  currency: string;
  status: IncentiveStatus;
  dueAt: Date | null;
  paidAt: Date | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  job: {
    title: string;
    slug: string;
  } | null;
}

export interface IIncentiveStats {
  totalCollectedCents: number;
  totalPending: number;
  pendingValueCents: number;
  totalOverdue: number;
  overdueValueCents: number;
  totalDisputed: number;
  totalWaived: number;
  totalPaid: number;
}

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

/**
 * Recalculates org.hasUnpaidIncentives based on count of PENDING + OVERDUE.
 * Call after every incentive status change.
 */
async function syncOrgIncentiveFlag(orgId: string): Promise<void> {
  const unpaidCount = await prisma.hiringIncentive.count({
    where: {
      orgId,
      status: { in: ['PENDING', 'OVERDUE'] },
    },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { hasUnpaidIncentives: unpaidCount > 0 },
  });
}

/**
 * Builds the shared include shape for incentive queries — candidate + job info.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function incentiveInclude() {
  return {
    application: {
      include: {
        user: {
          include: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    },
    job: {
      select: { title: true, slug: true },
    },
  } as const;
}

/**
 * Maps a raw Prisma incentive row (with relations) to IIncentiveResponse.
 */
function mapIncentive(
  raw: Prisma.HiringIncentiveGetPayload<{ include: ReturnType<typeof incentiveInclude> }>,
): IIncentiveResponse {
  return {
    id: raw.id,
    orgId: raw.orgId,
    jobId: raw.jobId,
    applicationId: raw.applicationId,
    amount: raw.amount,
    currency: raw.currency,
    status: raw.status,
    dueAt: raw.dueAt,
    paidAt: raw.paidAt,
    stripePaymentIntentId: raw.stripePaymentIntentId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    candidate:
      raw.application.user.profile !== null
        ? {
            firstName: raw.application.user.profile.firstName,
            lastName: raw.application.user.profile.lastName,
            email: raw.application.user.email,
          }
        : null,
    job: raw.job !== null ? { title: raw.job.title, slug: raw.job.slug } : null,
  };
}

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

// ─────────────────────────────────────────────
// ADMIN — LIST ALL INCENTIVES
// ─────────────────────────────────────────────

export async function listAdminIncentives(query: AdminListIncentivesQuery): Promise<{
  incentives: IIncentiveResponse[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.HiringIncentiveWhereInput = {
    ...(query.status !== undefined && { status: query.status }),
    ...(query.orgId !== undefined && { orgId: query.orgId }),
  };

  const direction: Prisma.SortOrder = query.sortOrder ?? 'desc';
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
// ADMIN — GET SINGLE INCENTIVE
// ─────────────────────────────────────────────

export async function getAdminIncentive(id: string): Promise<IIncentiveResponse> {
  const incentive = await prisma.hiringIncentive.findUnique({
    where: { id },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  return mapIncentive(incentive);
}

// ─────────────────────────────────────────────
// ADMIN — INCENTIVE STATS
// ─────────────────────────────────────────────

export async function getIncentiveStats(): Promise<IIncentiveStats> {
  const [paidAgg, pendingCount, overdueCount, disputedCount, waivedCount, paidCount] =
    await Promise.all([
      prisma.hiringIncentive.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.hiringIncentive.count({ where: { status: 'PENDING' } }),
      prisma.hiringIncentive.count({ where: { status: 'OVERDUE' } }),
      prisma.hiringIncentive.count({ where: { status: 'DISPUTED' } }),
      prisma.hiringIncentive.count({ where: { status: 'WAIVED' } }),
      prisma.hiringIncentive.count({ where: { status: 'PAID' } }),
    ]);

  const pendingValueCents = pendingCount * INCENTIVE.AMOUNT_CENTS;
  const overdueValueCents = overdueCount * INCENTIVE.AMOUNT_CENTS;
  const totalCollectedCents = Math.round((paidAgg._sum.amount ?? 0) * 100);

  return {
    totalCollectedCents,
    totalPending: pendingCount,
    pendingValueCents,
    totalOverdue: overdueCount,
    overdueValueCents,
    totalDisputed: disputedCount,
    totalWaived: waivedCount,
    totalPaid: paidCount,
  };
}

// ─────────────────────────────────────────────
// ADMIN — WAIVE INCENTIVE
// ─────────────────────────────────────────────

export async function waiveIncentive(id: string, reason: string): Promise<{ message: string }> {
  const incentive = await prisma.hiringIncentive.findUnique({
    where: { id },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  if (incentive.status === 'PAID') {
    throw new BadRequestError('Paid incentives cannot be waived');
  }

  await prisma.hiringIncentive.update({
    where: { id },
    data: { status: 'WAIVED' },
  });

  await syncOrgIncentiveFlag(incentive.orgId);

  // Fire-and-forget email
  enqueueEmail({
    name: 'incentive:waived',
    orgId: incentive.orgId,
    applicationId: incentive.applicationId,
    reason,
  });

  return { message: 'Incentive waived successfully' };
}

// ─────────────────────────────────────────────
// ADMIN — RESOLVE DISPUTE
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function resolveDispute(
  id: string,
  resolution: 'collect' | 'waive',
  note?: string,
): Promise<{ message: string }> {
  const incentive = await prisma.hiringIncentive.findUnique({
    where: { id },
    include: incentiveInclude(),
  });

  if (incentive === null) throw new NotFoundError('Incentive not found');

  if (incentive.status !== 'DISPUTED') {
    throw new BadRequestError(
      `Cannot resolve — incentive is currently ${incentive.status.toLowerCase()}, not disputed`,
    );
  }

  if (resolution === 'waive') {
    await prisma.hiringIncentive.update({
      where: { id },
      data: { status: 'WAIVED' },
    });

    await syncOrgIncentiveFlag(incentive.orgId);

    enqueueEmail({
      name: 'incentive:waived',
      orgId: incentive.orgId,
      applicationId: incentive.applicationId,
      reason: note ?? 'Dispute resolved by admin — incentive waived.',
    });

    return { message: 'Dispute resolved — incentive waived' };
  }

  // resolution === 'collect' — attempt off-session charge
  const org = await prisma.organization.findUnique({
    where: { id: incentive.orgId },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  if (
    org?.stripeCustomerId === null ||
    org?.stripeDefaultPaymentMethodId === null ||
    org?.stripeDefaultPaymentMethodId === undefined ||
    org.stripeCustomerId === undefined
  ) {
    throw new BadRequestError(
      'Organization has no payment method on file. Cannot collect — waive instead.',
    );
  }

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
        platform: 'CareerArch',
        resolvedByAdmin: 'true',
      },
    });
  } catch (err: unknown) {
    const stripeErr = err as { message?: string };
    throw new BadRequestError(
      `Payment collection failed: ${stripeErr.message ?? 'Unknown error'}. Consider waiving instead.`,
    );
  }

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
        orgId: incentive.orgId,
        type: 'INCENTIVE',
        amount: incentive.amount,
        currency: incentive.currency,
        status: 'SUCCEEDED',
        stripePaymentIntentId: paymentIntent.id,
        description: `Hiring incentive (dispute resolved) — ${incentive.job?.title ?? 'Job'}`,
      },
    }),
  ]);

  await syncOrgIncentiveFlag(incentive.orgId);

  enqueueEmail({
    name: 'incentive:paid',
    orgId: incentive.orgId,
    applicationId: incentive.applicationId,
    paidAt: incentive.paidAt ?? now,
  });

  return { message: 'Dispute resolved — payment collected successfully' };
}

// ─────────────────────────────────────────────
// CRON — MARK OVERDUE (called by BullMQ worker)
// ─────────────────────────────────────────────

/**
 * Marks all PENDING incentives past their dueAt as OVERDUE.
 * Batch-recalculates hasUnpaidIncentives per affected org.
 * Called by: src/jobs/workers/incentive-overdue.worker.ts (daily 02:30 UTC)
 */
export async function markOverdueIncentives(): Promise<number> {
  const now = new Date();

  // Find affected org IDs before updating (need them for flag sync)
  const overdueRows = await prisma.hiringIncentive.findMany({
    where: { status: 'PENDING', dueAt: { lt: now } },
    select: { id: true, orgId: true, applicationId: true },
  });

  if (overdueRows.length === 0) return 0;

  const ids = overdueRows.map((r) => r.id);

  await prisma.hiringIncentive.updateMany({
    where: { id: { in: ids } },
    data: { status: 'OVERDUE' },
  });

  // Batch-recalculate per unique org
  const uniqueOrgIds = [...new Set(overdueRows.map((r) => r.orgId))];
  await Promise.all(uniqueOrgIds.map((orgId) => syncOrgIncentiveFlag(orgId)));

  // Send overdue emails (fire-and-forget)
  void (() => {
    for (const row of overdueRows) {
      enqueueEmail({
        name: 'incentive:overdue',
        orgId: row.orgId,
        applicationId: row.applicationId,
      });
    }
  })();

  logger.info(`Incentive overdue cron: marked ${overdueRows.length} incentive(s) as OVERDUE`);

  return overdueRows.length;
}
