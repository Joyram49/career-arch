/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';
import { addDays } from 'date-fns';

import { type IAdminJobListItem } from '../types';

import type { AdminListJobsQuery } from '@modules/admin/validations/admin.jobs.validation';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// LIST ALL JOBS (admin — all statuses, all orgs)
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function listAllJobs(query: AdminListJobsQuery): Promise<{
  data: IAdminJobListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const {
    search,
    status,
    jobType,
    category,
    orgId,
    salaryMin,
    salaryMax,
    deadlineStatus,
    sortBy,
    sortOrder,
  } = query;
  const { page, limit, skip } = extractPagination(query);

  const andConditions: Prisma.JobWhereInput[] = [];

  // Exclude trash (ARCHIVED) by default unless admin explicitly filters for it
  andConditions.push(status !== undefined ? { status } : { status: { not: 'ARCHIVED' } });

  if (orgId !== undefined) {
    andConditions.push({ orgId });
  }

  if (jobType !== undefined) {
    andConditions.push({ jobType });
  }

  if (category !== undefined && category.length > 0) {
    andConditions.push({ category: { contains: category, mode: 'insensitive' } });
  }

  if (search !== undefined && search.length > 0) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { organization: { profile: { companyName: { contains: search, mode: 'insensitive' } } } },
      ],
    });
  }

  // ── Salary range: overlap filter ────────────────────────────────────────
  // A job "matches" the requested [salaryMin, salaryMax] window if its own
  // salary range overlaps that window. Jobs with no salary data at all
  // (org didn't disclose it) are always kept — we never want to hide a job
  // just because salary info is missing.
  andConditions.push({
    OR: [
      { salaryMin: null, salaryMax: null },
      {
        AND: [
          { OR: [{ salaryMax: null }, { salaryMax: { gte: salaryMin } }] },
          { OR: [{ salaryMin: null }, { salaryMin: { lte: salaryMax } }] },
        ],
      },
    ],
  });

  // ── Deadline window ──────────────────────────────────────────────────────
  if (deadlineStatus === 'active') {
    andConditions.push({ OR: [{ deadline: null }, { deadline: { gte: new Date() } }] });
  } else if (deadlineStatus === 'expired') {
    andConditions.push({ deadline: { lt: new Date() } });
  }
  // 'all' → no extra condition

  const where: Prisma.JobWhereInput = { AND: andConditions };

  const direction: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.JobOrderByWithRelationInput =
    sortBy === 'publishedAt'
      ? { publishedAt: direction }
      : sortBy === 'views'
        ? { views: direction }
        : sortBy === 'title'
          ? { title: direction }
          : sortBy === 'salaryMin'
            ? { salaryMin: { sort: direction, nulls: 'last' } }
            : sortBy === 'salaryMax'
              ? { salaryMax: { sort: direction, nulls: 'last' } }
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
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        vacancies: true,
        skills: true,
        experienceLevel: true,
        category: true,
        deadline: true,
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

// ─────────────────────────────────────────────
// REPUBLISH JOB (CLOSED → PUBLISHED)
// ─────────────────────────────────────────────

export async function republishJob(jobId: string): Promise<{ message: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, title: true, deadline: true },
  });

  if (job === null) {
    throw new NotFoundError('Job not found');
  }

  if (job.status !== 'CLOSED') {
    throw new BadRequestError('Only closed jobs can be republished');
  }

  // Guard: republishing a job whose deadline already passed would put it
  // back in front of applicants who can no longer apply — inconsistent UX.
  if (job.deadline !== null && job.deadline < new Date()) {
    throw new BadRequestError(
      'Cannot republish a job whose deadline has already passed. Ask the organization to update the deadline first.',
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PUBLISHED' },
  });

  await prisma.notification.create({
    data: {
      recipientRole: 'ADMIN',
      title: 'Job Republished',
      message: `Job "${job.title}" (${jobId}) was republished by an admin.`,
      link: `/admin/jobs`,
    },
  });

  return { message: `Job "${job.title}" has been republished successfully.` };
}

// ─────────────────────────────────────────────
// ARCHIVE JOB (CLOSED → ARCHIVED, soft delete → trash bin)
// ─────────────────────────────────────────────

const RETENTION_DAYS = 30;

export async function archiveJob(jobId: string, reason?: string): Promise<{ message: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, title: true, orgId: true },
  });

  if (job === null) {
    throw new NotFoundError('Job not found');
  }

  if (job.status === 'ARCHIVED') {
    throw new BadRequestError('Job is already archived');
  }

  // Only closed jobs can go to the trash bin — forces admin through the
  // takedown step first, so a live/draft job is never archived by accident.
  if (job.status !== 'CLOSED') {
    throw new BadRequestError('Only closed jobs can be archived. Take down the job first.');
  }

  const deleteAt = addDays(new Date(), RETENTION_DAYS);

  await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { status: 'ARCHIVED' },
    }),
    prisma.deletedJob.create({
      data: {
        jobId: job.id,
        orgId: job.orgId,
        deleteAt,
      },
    }),
    prisma.notification.create({
      data: {
        recipientRole: 'ADMIN',
        title: 'Job Archived',
        message: `Job "${job.title}" (${jobId}) was archived by an admin.${
          reason !== undefined && reason.length > 0 ? ` Reason: ${reason}` : ''
        }`,
        link: `/admin/jobs`,
      },
    }),
  ]);

  return {
    message: `Job "${job.title}" has been archived. It will be permanently deleted in ${RETENTION_DAYS} days.`,
  };
}
