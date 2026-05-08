import { prisma } from '@config/database';
import { ConflictError, NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta, parsePagination } from '@shared/utils/pagination';

import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// SAVE A JOB
// ─────────────────────────────────────────────

export async function saveJob(userId: string, jobId: string): Promise<{ message: string }> {
  // Verify job exists and is published
  const job = await prisma.job.findFirst({
    where: { id: jobId, status: 'PUBLISHED' },
    select: { id: true, title: true },
  });

  if (job === null) {
    throw new NotFoundError('Job not found or no longer available');
  }

  // Duplicate guard
  const existing = await prisma.savedJob.findUnique({
    where: { userId_jobId: { userId, jobId } },
    select: { id: true },
  });

  if (existing !== null) {
    throw new ConflictError('You have already saved this job');
  }

  await prisma.savedJob.create({
    data: { userId, jobId },
  });

  // Increment denormalized counter — already guarded by checkSaveJobLimit middleware
  await prisma.subscription.update({
    where: { userId },
    data: { savedJobCount: { increment: 1 } },
  });

  return { message: `Job "${job.title}" saved successfully` };
}

// ─────────────────────────────────────────────
// UNSAVE A JOB
// ─────────────────────────────────────────────

export async function unsaveJob(userId: string, jobId: string): Promise<{ message: string }> {
  const saved = await prisma.savedJob.findUnique({
    where: { userId_jobId: { userId, jobId } },
    select: { id: true },
  });

  if (saved === null) {
    throw new NotFoundError('Saved job not found');
  }

  await prisma.savedJob.delete({
    where: { id: saved.id },
  });

  // Decrement counter — floor at 0 to avoid negative values
  await prisma.subscription.updateMany({
    where: { userId, savedJobCount: { gt: 0 } },
    data: { savedJobCount: { decrement: 1 } },
  });

  return { message: 'Job removed from saved list' };
}

// ─────────────────────────────────────────────
// LIST SAVED JOBS
// ─────────────────────────────────────────────

export async function listSavedJobs(
  userId: string,
  query: { page: number; limit: number; sortOrder?: 'asc' | 'desc' },
): Promise<{ data: object[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const { sortOrder = 'desc' } = query;
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.SavedJobWhereInput = { userId };

  const [savedJobs, total] = await Promise.all([
    prisma.savedJob.findMany({
      where,
      orderBy: { savedAt: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        savedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            jobType: true,
            location: true,
            isRemote: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            experienceLevel: true,
            skills: true,
            requiredPlan: true,
            deadline: true,
            status: true,
            publishedAt: true,
            _count: { select: { applications: true } },
            organization: {
              select: {
                profile: {
                  select: { companyName: true, logoUrl: true, industry: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.savedJob.count({ where }),
  ]);

  return {
    data: savedJobs,
    meta: buildPaginationMeta(total, page, limit),
  };
}
