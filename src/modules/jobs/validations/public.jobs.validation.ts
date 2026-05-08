import { z } from 'zod';

// ─────────────────────────────────────────────
// PUBLIC JOB SEARCH  (GET /jobs)
// ─────────────────────────────────────────────

export const publicJobSearchSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    location: z.string().trim().max(200).optional(),
    type: z
      .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE', 'REMOTE'])
      .optional(),
    category: z.string().trim().max(100).optional(),
    experienceLevel: z.enum(['Entry', 'Junior', 'Mid', 'Senior', 'Lead']).optional(),
    salaryMin: z.coerce.number().positive().optional(),
    salaryMax: z.coerce.number().positive().optional(),
    isRemote: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    sortBy: z.enum(['publishedAt', 'createdAt', 'salaryMax']).default('publishedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ─────────────────────────────────────────────
// JOB SLUG PARAM  (GET /jobs/:slug)
// ─────────────────────────────────────────────

export const jobSlugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Job slug is required').max(200, 'Invalid slug'),
  }),
});

// ─────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────

export type PublicJobSearchQuery = z.infer<typeof publicJobSearchSchema>['query'];
