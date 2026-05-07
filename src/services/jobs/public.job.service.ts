import { prisma } from '@config/database';
import { NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';

import type { IJwtPayload } from '@app-types/index';
import type { Prisma, SubscriptionPlan } from '@prisma/client';
import type { PublicJobSearchQuery } from '@validations/public.jobs.validation';

// ─────────────────────────────────────────────
// PLAN VISIBILITY MAP
// ─────────────────────────────────────────────

/**
 * Returns which requiredPlan values are visible to this user.
 * FREE → only FREE jobs
 * BASIC → FREE + BASIC
 * PREMIUM → all (FREE + BASIC + PREMIUM)
 */
function getVisiblePlans(userPlan: SubscriptionPlan): SubscriptionPlan[] {
  if (userPlan === 'PREMIUM') return ['FREE', 'BASIC', 'PREMIUM'];
  if (userPlan === 'BASIC') return ['FREE', 'BASIC'];
  return ['FREE'];
}

// ─────────────────────────────────────────────
// PUBLIC JOB SEARCH
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function searchPublicJobs(
  user: IJwtPayload | null,
  query: PublicJobSearchQuery,
): Promise<{
  data: object[];
  meta: object & { isLimited?: boolean; limitMessage?: string };
}> {
  const {
    q,
    location,
    type,
    category,
    experienceLevel,
    salaryMin,
    salaryMax,
    isRemote,
    sortBy,
    sortOrder,
  } = query;

  // Determine user's plan — guests treated as FREE
  const userPlan: SubscriptionPlan = user?.plan ?? 'FREE';
  const isFree = userPlan === 'FREE' || user === null;

  // FREE users: hard-cap at page 1, limit 20
  const page = isFree ? 1 : query.page;
  const limit = isFree ? Math.min(query.limit, 20) : query.limit;
  const skip = (page - 1) * limit;

  const visiblePlans = getVisiblePlans(userPlan);

  // ── Build where clause ─────────────────────────────────────────────────
  const where: Prisma.JobWhereInput = {
    status: 'PUBLISHED',
    requiredPlan: { in: visiblePlans },
    // Exclude expired deadline jobs
    OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
  };

  // Keyword search — title, category, skills
  if (q !== undefined && q.length > 0) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { skills: { hasSome: [q] } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  if (location !== undefined && location.length > 0) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (type !== undefined) {
    where.jobType = type;
  }

  if (category !== undefined && category.length > 0) {
    where.category = { contains: category, mode: 'insensitive' };
  }

  if (experienceLevel !== undefined) {
    where.experienceLevel = experienceLevel;
  }

  if (isRemote === true) {
    where.isRemote = true;
  }

  if (salaryMin !== undefined) {
    where.salaryMin = { gte: salaryMin };
  }

  if (salaryMax !== undefined) {
    where.salaryMax = { lte: salaryMax };
  }

  // ── Build orderBy ──────────────────────────────────────────────────────
  const orderBy: Prisma.JobOrderByWithRelationInput =
    // eslint-disable-next-line no-nested-ternary
    sortBy === 'salaryMax'
      ? { salaryMax: sortOrder }
      : sortBy === 'createdAt'
        ? { createdAt: sortOrder }
        : { publishedAt: sortOrder };

  const [jobs, total] = await Promise.all([
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
        location: true,
        isRemote: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        experienceLevel: true,
        skills: true,
        category: true,
        requiredPlan: true,
        deadline: true,
        vacancies: true,
        views: true,
        publishedAt: true,
        _count: { select: { applications: true } },
        organization: {
          select: {
            id: true,
            profile: {
              select: { companyName: true, logoUrl: true, industry: true, location: true },
            },
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const meta: object & { isLimited?: boolean; limitMessage?: string } = {
    ...buildPaginationMeta(total, page, limit),
    ...(isFree && {
      isLimited: true,
      limitMessage: 'Upgrade to Basic or Premium to see all jobs and apply to more',
    }),
  };

  return { data: jobs, meta };
}

// ─────────────────────────────────────────────
// PUBLIC JOB DETAIL BY SLUG
// ─────────────────────────────────────────────

export async function getPublicJobBySlug(slug: string, userId?: string): Promise<object> {
  const job = await prisma.job.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      organization: {
        select: {
          id: true,
          isApproved: true,
          profile: {
            select: {
              companyName: true,
              logoUrl: true,
              website: true,
              industry: true,
              companySize: true,
              foundedYear: true,
              description: true,
              location: true,
              country: true,
              linkedinUrl: true,
              twitterUrl: true,
            },
          },
        },
      },
      _count: { select: { applications: true } },
    },
  });

  if (job === null) throw new NotFoundError('Job not found');

  // Increment views — fire-and-forget, never blocks response
  void prisma.job.update({
    where: { id: job.id },
    data: { views: { increment: 1 } },
  });

  // If authenticated user, attach isApplied + isSaved flags
  let isApplied = false;
  let isSaved = false;

  if (userId !== undefined) {
    const [application, savedJob] = await Promise.all([
      prisma.application.findUnique({
        where: { jobId_userId: { jobId: job.id, userId } },
        select: { id: true, status: true },
      }),
      prisma.savedJob.findUnique({
        where: { userId_jobId: { userId, jobId: job.id } },
        select: { id: true },
      }),
    ]);

    isApplied = application !== null;
    isSaved = savedJob !== null;
  }

  return { ...job, isApplied, isSaved };
}

// ─────────────────────────────────────────────
// GET JOB CATEGORIES
// ─────────────────────────────────────────────

export async function getJobCategories(): Promise<string[]> {
  const result = await prisma.job.findMany({
    where: {
      status: 'PUBLISHED',
      category: { not: null },
    },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return result.map((r) => r.category).filter((c): c is string => c !== null);
}
