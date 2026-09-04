import { z } from 'zod';

// ── List all jobs (admin) ──────────────────────────────────────────────────

const DEFAULT_SALARY_MIN = 0;
const DEFAULT_SALARY_MAX = 10_000_000; // effectively "no ceiling" for real-world job salaries

export const adminListJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
    jobType: z
      .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE', 'REMOTE'])
      .optional(),
    category: z.string().trim().optional(),
    orgId: z.string().uuid('Invalid organization ID').optional(),

    // ── Salary range (overlap filter, always has a sane default window) ────
    salaryMin: z.coerce.number().min(0).default(DEFAULT_SALARY_MIN),
    salaryMax: z.coerce.number().min(0).default(DEFAULT_SALARY_MAX),

    // ── Deadline window ──────────────────────────────────────────────────
    deadlineStatus: z.enum(['active', 'expired', 'all']).default('all'),

    sortBy: z
      .enum(['createdAt', 'publishedAt', 'views', 'title', 'salaryMin', 'salaryMax'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ── Takedown job ───────────────────────────────────────────────────────────

export const takedownJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, 'Please provide a reason (minimum 10 characters)')
      .max(500, 'Reason must be at most 500 characters'),
  }),
});

// ── Republish job (CLOSED → PUBLISHED) ─────────────────────────────────────

export const republishJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

// ── Archive job (CLOSED → ARCHIVED, soft delete) ────────────────────────────

export const archiveJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
  body: z.object({
    reason: z.string().trim().max(500, 'Reason must be at most 500 characters').optional(),
  }),
});

// ── Job ID param ───────────────────────────────────────────────────────────

export const adminJobIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type AdminListJobsQuery = z.infer<typeof adminListJobsSchema>['query'];
export type TakedownJobInput = z.infer<typeof takedownJobSchema>['body'];
export type ArchiveJobInput = z.infer<typeof archiveJobSchema>['body'];
export type AdminJobIdParam = z.infer<typeof adminJobIdParamSchema>['params'];
