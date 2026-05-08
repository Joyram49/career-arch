/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { type IAdminJobListItem } from '../types';

import type { AdminListJobsQuery } from '@modules/admin/validations/admin.jobs.validation';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// LIST ALL JOBS (admin — all statuses, all orgs)
// ─────────────────────────────────────────────

export async function listAllJobs(query: AdminListJobsQuery): Promise<{
  data: IAdminJobListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { search, status, orgId, sortBy, sortOrder } = query;
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.JobWhereInput = {
    // Exclude trash (ARCHIVED) by default unless admin explicitly filters for it
    ...(status !== undefined ? { status } : { status: { not: 'ARCHIVED' } }),
    ...(orgId !== undefined && { orgId }),
    ...(search !== undefined &&
      search.length > 0 && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { organization: { profile: { companyName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
  };

  const direction: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.JobOrderByWithRelationInput =
    sortBy === 'publishedAt'
      ? { publishedAt: direction }
      : sortBy === 'views'
        ? { views: direction }
        : sortBy === 'title'
          ? { title: direction }
          : { createdAt: direction };

  const [data, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        jobType: true,
        status: true,
        location: true,
        isRemote: true,
        requiredPlan: true,
        views: true,
        publishedAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            email: true,
            profile: { select: { companyName: true } },
          },
        },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}

// ─────────────────────────────────────────────
// TAKEDOWN JOB (admin force-close + archive)
// ─────────────────────────────────────────────

export async function takedownJob(jobId: string, reason: string): Promise<{ message: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, title: true },
  });

  if (job === null) {
    throw new NotFoundError('Job not found');
  }

  if (job.status === 'ARCHIVED') {
    throw new NotFoundError('Job not found');
  }

  // Force-close the job regardless of current status
  // Admin takedown sets status to CLOSED (not ARCHIVED — keeps it visible to admin)
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CLOSED' },
  });

  // Log takedown reason in a notification for audit trail
  await prisma.notification.create({
    data: {
      recipientRole: 'ADMIN',
      title: 'Job Taken Down',
      message: `Job "${job.title}" (${jobId}) was taken down. Reason: ${reason}`,
      link: `/admin/jobs`,
    },
  });

  return { message: `Job "${job.title}" has been taken down successfully.` };
}
