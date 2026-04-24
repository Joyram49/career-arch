import { z } from 'zod';

// ── Reusable sub-schemas ───────────────────────────────────────────────────

const jobTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
  'REMOTE',
]);

const experienceLevelEnum = z.enum(['Entry', 'Junior', 'Mid', 'Senior', 'Lead']);

const subscriptionPlanEnum = z.enum(['FREE', 'BASIC', 'PREMIUM']);

const jobStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);

// ── Base body shape (used for create + partial update) ────────────────────

const jobBodyShape = {
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must be at most 150 characters'),

  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(50, 'Description must be at least 50 characters')
    .max(50_000, 'Description is too long'),

  requirements: z.string().max(20_000, 'Requirements text is too long').optional(),

  responsibilities: z.string().max(20_000, 'Responsibilities text is too long').optional(),

  jobType: jobTypeEnum,

  location: z.string().trim().max(200, 'Location must be at most 200 characters').optional(),

  isRemote: z.boolean().default(false),

  salaryMin: z.number().positive('Salary must be a positive number').optional(),

  salaryMax: z.number().positive('Salary must be a positive number').optional(),

  salaryCurrency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code (e.g. USD)')
    .default('USD'),

  experienceLevel: experienceLevelEnum.optional(),

  skills: z
    .array(z.string().trim().max(50, 'Skill name too long'))
    .max(20, 'Cannot add more than 20 skills')
    .default([]),

  category: z.string().trim().max(100, 'Category must be at most 100 characters').optional(),

  deadline: z.coerce
    .date()
    .refine((d) => d > new Date(), { message: 'Deadline must be in the future' })
    .optional(),

  vacancies: z.number().int().min(1, 'At least 1 vacancy required').max(999).default(1),

  // TODO [FUTURE - Phase X: requiredPlan Permission Gate]
  // Add service-layer check: orgs on FREE plan cannot set requiredPlan = BASIC or PREMIUM.
  // Currently any approved org can set any requiredPlan value — deferred intentionally.
  requiredPlan: subscriptionPlanEnum.default('FREE'),
};

// ── Cross-field refinements (applied to both create and update) ────────────

function applyJobRefinements<T extends z.ZodObject<typeof jobBodyShape>>(schema: T): T {
  return schema
    .refine((d) => d.location !== undefined || d.isRemote === true, {
      message: 'Must provide a location or mark the job as remote',
      path: ['location'],
    })
    .refine(
      (d) => {
        if (d.salaryMin !== undefined && d.salaryMax !== undefined) {
          return d.salaryMax >= d.salaryMin;
        }
        return true;
      },
      { message: 'salaryMax must be greater than or equal to salaryMin', path: ['salaryMax'] },
    );
}

// ─────────────────────────────────────────────
// CREATE JOB
// ─────────────────────────────────────────────

export const createJobSchema = z.object({
  body: applyJobRefinements(z.object(jobBodyShape)),
});

// ─────────────────────────────────────────────
// UPDATE JOB
// ─────────────────────────────────────────────

// All fields optional on update — only provided fields are changed
const updateBodyShape = Object.fromEntries(
  Object.entries(jobBodyShape).map(([k, v]) => [k, v.optional()]),
) as { [K in keyof typeof jobBodyShape]: z.ZodOptional<(typeof jobBodyShape)[K]> };

export const updateJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
  body: z
    .object(updateBodyShape)
    .refine(
      (d) => {
        // Only enforce location/remote rule if at least one is present in payload
        const hasLocation = d.location !== undefined;
        const hasRemote = d.isRemote !== undefined;
        if (!hasLocation && !hasRemote) return true;
        return d.location !== undefined || d.isRemote === true;
      },
      {
        message: 'Must provide a location or mark the job as remote',
        path: ['location'],
      },
    )
    .refine(
      (d) => {
        if (d.salaryMin !== undefined && d.salaryMax !== undefined) {
          return d.salaryMax >= d.salaryMin;
        }
        return true;
      },
      { message: 'salaryMax must be greater than or equal to salaryMin', path: ['salaryMax'] },
    ),
});

// ─────────────────────────────────────────────
// LIST ORG JOBS
// ─────────────────────────────────────────────

export const listOrgJobsSchema = z.object({
  query: z.object({
    // ARCHIVED is intentionally excluded from the UI list — it is the internal soft-delete state
    status: jobStatusEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'publishedAt', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ─────────────────────────────────────────────
// LIST DELETED JOBS (trash view)
// ─────────────────────────────────────────────

export const listDeletedJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

// ─────────────────────────────────────────────
// JOB ID PARAM (reused by get, delete, publish, close, restore)
// ─────────────────────────────────────────────

export const jobIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type CreateJobInput = z.infer<typeof createJobSchema>['body'];
export type UpdateJobInput = z.infer<typeof updateJobSchema>['body'];
export type ListOrgJobsQuery = z.infer<typeof listOrgJobsSchema>['query'];
export type ListDeletedJobsQuery = z.infer<typeof listDeletedJobsSchema>['query'];
