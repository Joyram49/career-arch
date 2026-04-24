/* eslint-disable complexity */
/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { BadRequestError, NotFoundError } from '@utils/apiError';
import { buildPaginationMeta, parsePagination } from '@utils/pagination';
import { sanitizeHtml, sanitizeOptionalHtml } from '@utils/sanitize';
import { generateSlug } from '@utils/slug';

import type { IPaginationResult } from '@app-types/index';
import type { Job, JobStatus, JobType, Prisma, SubscriptionPlan } from '@prisma/client';
import type {
  CreateJobInput,
  ListDeletedJobsQuery,
  ListOrgJobsQuery,
  UpdateJobInput,
} from '@validations/jobs.validation';

// ─────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────

export interface IJobResponse {
  id: string;
  orgId: string;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  jobType: JobType;
  status: JobStatus;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceLevel: string | null;
  skills: string[];
  category: string | null;
  deadline: Date | null;
  vacancies: number;
  views: number;
  requiredPlan: SubscriptionPlan;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { applications: number };
}

export interface IDeletedJobResponse {
  id: string;
  jobId: string;
  orgId: string;
  deletedAt: Date;
  deleteAt: Date;
  job: IJobResponse;
}

// ─────────────────────────────────────────────
// SOFT DELETE TTL
// ─────────────────────────────────────────────

const TRASH_TTL_DAYS = 30;

function getDeleteAtDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + TRASH_TTL_DAYS);
  return date;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Find a job that belongs to this org — throws if not found or wrong owner.
 * Excludes ARCHIVED jobs from normal lookups (they live in trash).
 */
async function findOwnedJob(
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

// ─────────────────────────────────────────────
// CREATE JOB
// ─────────────────────────────────────────────

export async function createJob(orgId: string, data: CreateJobInput): Promise<IJobResponse> {
  const slug = generateSlug(data.title);

  //   test comment
  // again

  const job = await prisma.job.create({
    data: {
      orgId,
      slug,
      title: data.title,
      description: sanitizeHtml(data.description),
      requirements: sanitizeOptionalHtml(data.requirements),
      responsibilities: sanitizeOptionalHtml(data.responsibilities),
      jobType: data.jobType,
      location: data.location ?? null,
      isRemote: data.isRemote,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      experienceLevel: data.experienceLevel ?? null,
      skills: data.skills,
      category: data.category ?? null,
      deadline: data.deadline ?? null,
      vacancies: data.vacancies,
      requiredPlan: data.requiredPlan,
      status: 'DRAFT',
    },
  });

  return job;
}

// ─────────────────────────────────────────────
// GET SINGLE JOB (org view)
// ─────────────────────────────────────────────

export async function getOrgJob(orgId: string, jobId: string): Promise<IJobResponse> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, orgId, status: { not: 'ARCHIVED' } },
    include: { _count: { select: { applications: true } } },
  });

  if (job === null) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

// ─────────────────────────────────────────────
// LIST ORG JOBS
// ─────────────────────────────────────────────

export async function listOrgJobs(
  orgId: string,
  query: ListOrgJobsQuery,
): Promise<IPaginationResult<IJobResponse>> {
  const { skip, take, page, limit } = parsePagination(query);

  const where: Prisma.JobWhereInput = {
    orgId,
    // Exclude ARCHIVED — those live in trash and are fetched via listDeletedJobs
    status: query.status ?? { not: 'ARCHIVED' },
  };

  const orderBy: Prisma.JobOrderByWithRelationInput =
    query.sortBy === 'title'
      ? { title: query.sortOrder }
      : query.sortBy === 'publishedAt'
        ? { publishedAt: query.sortOrder }
        : { createdAt: query.sortOrder };

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    data: jobs,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// UPDATE JOB
// ─────────────────────────────────────────────

export async function updateJob(
  orgId: string,
  jobId: string,
  data: UpdateJobInput,
): Promise<IJobResponse> {
  const existing = await findOwnedJob(orgId, jobId);

  if (existing.status === 'ARCHIVED') {
    throw new BadRequestError('Archived jobs cannot be edited. Restore the job first.');
  }

  // Build update payload — only include fields present in the request
  const updateData: Prisma.JobUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  // Slug intentionally NOT updated — SEO stability
  if (data.description !== undefined) updateData.description = sanitizeHtml(data.description);
  if (data.requirements !== undefined)
    updateData.requirements = sanitizeOptionalHtml(data.requirements);
  if (data.responsibilities !== undefined)
    updateData.responsibilities = sanitizeOptionalHtml(data.responsibilities);
  if (data.jobType !== undefined) updateData.jobType = data.jobType;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.isRemote !== undefined) updateData.isRemote = data.isRemote;
  if (data.salaryMin !== undefined) updateData.salaryMin = data.salaryMin;
  if (data.salaryMax !== undefined) updateData.salaryMax = data.salaryMax;
  if (data.salaryCurrency !== undefined) updateData.salaryCurrency = data.salaryCurrency;
  if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
  if (data.skills !== undefined) updateData.skills = data.skills;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.deadline !== undefined) updateData.deadline = data.deadline;
  if (data.vacancies !== undefined) updateData.vacancies = data.vacancies;
  if (data.requiredPlan !== undefined) updateData.requiredPlan = data.requiredPlan;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: updateData,
  });

  return job;
}

// ─────────────────────────────────────────────
// PUBLISH JOB
// ─────────────────────────────────────────────

export async function publishJob(orgId: string, jobId: string): Promise<IJobResponse> {
  const job = await findOwnedJob(orgId, jobId);

  if (job.status === 'PUBLISHED') {
    throw new BadRequestError('Job is already published');
  }

  if (job.status === 'ARCHIVED') {
    throw new BadRequestError('Archived jobs cannot be published. Restore the job first.');
  }

  // Validate minimum required fields before going live
  const missingFields: string[] = [];
  if (job.title.trim().length === 0) missingFields.push('title');
  if (job.description.trim().length === 0) missingFields.push('description');
  if (job.location == null && !job.isRemote) missingFields.push('location (or mark as remote)');

  if (missingFields.length > 0) {
    throw new BadRequestError(
      `Cannot publish: missing required fields — ${missingFields.join(', ')}`,
    );
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });

  return updated;
}

// ─────────────────────────────────────────────
// CLOSE JOB
// ─────────────────────────────────────────────

export async function closeJob(orgId: string, jobId: string): Promise<IJobResponse> {
  const job = await findOwnedJob(orgId, jobId);

  if (job.status !== 'PUBLISHED') {
    throw new BadRequestError('Only published jobs can be closed');
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CLOSED' },
  });

  return updated;
}

// ─────────────────────────────────────────────
// SOFT DELETE JOB (move to trash)
// ─────────────────────────────────────────────

export async function softDeleteJob(orgId: string, jobId: string): Promise<void> {
  const job = await findOwnedJob(orgId, jobId);

  if (job.status === 'PUBLISHED') {
    throw new BadRequestError(
      'Published jobs cannot be deleted. Close the job first, then delete it.',
    );
  }

  if (job.status === 'ARCHIVED') {
    throw new BadRequestError('Job is already in the trash');
  }

  await prisma.$transaction([
    // 1. Create trash entry (FK to job row)
    prisma.deletedJob.create({
      data: {
        jobId,
        orgId,
        deleteAt: getDeleteAtDate(),
      },
    }),
    // 2. Mark job as ARCHIVED (invisible to all public/org list endpoints)
    prisma.job.update({
      where: { id: jobId },
      data: { status: 'ARCHIVED' },
    }),
  ]);
}

// ─────────────────────────────────────────────
// RESTORE JOB (from trash)
// ─────────────────────────────────────────────

export async function restoreJob(orgId: string, jobId: string): Promise<IJobResponse> {
  // Find the trash entry scoped to this org
  const deletedEntry = await prisma.deletedJob.findFirst({
    where: { jobId, orgId },
  });

  if (deletedEntry === null) {
    throw new NotFoundError('Job not found in trash');
  }

  // Check TTL — has the 30-day window expired?
  if (deletedEntry.deleteAt < new Date()) {
    throw new BadRequestError(
      'This job has passed its restore window and will be permanently deleted shortly.',
    );
  }

  // Find the original ARCHIVED job row via FK
  const archivedJob = await prisma.job.findFirst({
    where: { id: jobId, orgId, status: 'ARCHIVED' },
  });

  if (archivedJob === null) {
    // Edge case: job row is gone (e.g. manual DB intervention before cleanup ran)
    throw new NotFoundError(
      'Original job record not found. The job may have already been permanently deleted.',
    );
  }

  const [restoredJob] = await prisma.$transaction([
    // 1. Restore to CLOSED — org must review before re-publishing
    prisma.job.update({
      where: { id: jobId },
      data: { status: 'CLOSED' },
    }),
    // 2. Remove trash entry
    prisma.deletedJob.delete({
      where: { id: deletedEntry.id },
    }),
  ]);

  return restoredJob;
}

// ─────────────────────────────────────────────
// LIST DELETED JOBS (trash view)
// ─────────────────────────────────────────────

export async function listDeletedJobs(
  orgId: string,
  query: ListDeletedJobsQuery,
): Promise<IPaginationResult<IDeletedJobResponse>> {
  const { skip, take, page, limit } = parsePagination(query);

  const where: Prisma.DeletedJobWhereInput = { orgId };

  const [deletedJobs, total] = await prisma.$transaction([
    prisma.deletedJob.findMany({
      where,
      orderBy: { deletedAt: 'desc' },
      skip,
      take,
      include: {
        job: true,
      },
    }),
    prisma.deletedJob.count({ where }),
  ]);

  return {
    data: deletedJobs as IDeletedJobResponse[],
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// CLEANUP EXPIRED JOBS (called by BullMQ worker)
// ─────────────────────────────────────────────

/**
 * Hard-deletes ARCHIVED Job rows whose DeletedJob.deleteAt has passed.
 * onDelete: Cascade on DeletedJob removes trash entries automatically.
 * Also cascades to applications, saved_jobs, hiring_incentives.
 *
 * Called by: src/jobs/workers/job-cleanup.worker.ts (daily at 02:00 UTC)
 */
export async function cleanupExpiredJobs(): Promise<number> {
  const expiredEntries = await prisma.deletedJob.findMany({
    where: { deleteAt: { lt: new Date() } },
    select: { jobId: true },
  });

  if (expiredEntries.length === 0) return 0;

  const expiredJobIds = expiredEntries.map((e) => e.jobId);

  // Hard-delete the ARCHIVED Job rows.
  // Cascade: DeletedJob records removed automatically via FK.
  // Cascade: applications, saved_jobs, hiring_incentives also removed.
  const result = await prisma.job.deleteMany({
    where: {
      id: { in: expiredJobIds },
      status: 'ARCHIVED', // safety guard — never delete non-archived jobs
    },
  });

  return result.count;
}
