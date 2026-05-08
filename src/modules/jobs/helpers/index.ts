// ─────────────────────────────────────────────
// SOFT DELETE TTL
// ─────────────────────────────────────────────

import { type Job, type Prisma, type SubscriptionPlan } from '@prisma/client';

import { prisma } from '@/config/database';
import { NotFoundError } from '@/shared/utils/apiError';

const TRASH_TTL_DAYS = 30;

export function getDeleteAtDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + TRASH_TTL_DAYS);
  return date;
}

/**
 * Find a job that belongs to this org — throws if not found or wrong owner.
 * Excludes ARCHIVED jobs from normal lookups (they live in trash).
 */
export async function findOwnedJob(
  orgId: string,
  jobId: string,
  includeArchived = false,
): Promise<Job & { _count?: { applications: number } }> {
  const statusFilter: Prisma.JobWhereInput = includeArchived ? {} : { status: { not: 'ARCHIVED' } };

  const job = await prisma.job.findFirst({
    where: { id: jobId, orgId, ...statusFilter },
  });

  if (job === null) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

/**
 * Returns which requiredPlan values are visible to this user.
 * FREE → only FREE jobs
 * BASIC → FREE + BASIC
 * PREMIUM → all (FREE + BASIC + PREMIUM)
 */
export function getVisiblePlans(userPlan: SubscriptionPlan): SubscriptionPlan[] {
  if (userPlan === 'PREMIUM') return ['FREE', 'BASIC', 'PREMIUM'];
  if (userPlan === 'BASIC') return ['FREE', 'BASIC'];
  return ['FREE'];
}
