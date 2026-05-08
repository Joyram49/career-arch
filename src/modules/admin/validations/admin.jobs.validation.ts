import { z } from 'zod';

// ── List all jobs (admin) ──────────────────────────────────────────────────

export const adminListJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
    orgId: z.string().uuid('Invalid organization ID').optional(),
    sortBy: z.enum(['createdAt', 'publishedAt', 'views', 'title']).default('createdAt'),
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

// ── Job ID param ───────────────────────────────────────────────────────────

export const adminJobIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type AdminListJobsQuery = z.infer<typeof adminListJobsSchema>['query'];
export type TakedownJobInput = z.infer<typeof takedownJobSchema>['body'];
export type AdminJobIdParam = z.infer<typeof adminJobIdParamSchema>['params'];
