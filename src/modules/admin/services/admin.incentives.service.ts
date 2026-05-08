/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { env } from '@config/env';
import { stripe } from '@config/stripe';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { INCENTIVE } from '@shared/utils/constants';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { logger } from '@/config/logger';
import { enqueueEmail } from '@/jobs/queues/email.queue';
import { incentiveInclude, mapIncentive, syncOrgIncentiveFlag } from '@/modules/incentives/helpers';
import { type IIncentiveResponse, type IIncentiveStats } from '@/modules/incentives/types';

import type { AdminListIncentivesQuery } from '@modules/incentives/validations/incentive.validation';
import type { Prisma } from '@prisma/client';

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
