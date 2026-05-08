import { type Prisma } from '@prisma/client';

import { prisma } from '@/config/database';

import { type IIncentiveResponse } from '../types';

/**
 * Recalculates org.hasUnpaidIncentives based on count of PENDING + OVERDUE.
 * Call after every incentive status change.
 */
export async function syncOrgIncentiveFlag(orgId: string): Promise<void> {
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

const INCENTIVE_INCLUDE = {
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
} as const satisfies Prisma.HiringIncentiveInclude;

export function incentiveInclude(): typeof INCENTIVE_INCLUDE {
  return INCENTIVE_INCLUDE;
}

/**
 * Maps a raw Prisma incentive row (with relations) to IIncentiveResponse.
 */
export function mapIncentive(
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
    job: { title: raw.job.title, slug: raw.job.slug },
  };
}
