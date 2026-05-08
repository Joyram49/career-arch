import { z } from 'zod';

// ─────────────────────────────────────────────
// CREATE APPLICATION  (POST /applications)
// ─────────────────────────────────────────────

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

const jsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue), // <- key + value explicitly
  ]),
);
export const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().uuid('Invalid job ID'),

    coverLetter: z
      .string()
      .trim()
      .max(5000, 'Cover letter must be at most 5000 characters')
      .optional(),

    resumeUrl: z
      .string()
      .trim()
      .url('Invalid resume URL')
      .optional()
      .or(z.literal(''))
      .transform((v) => (v === '' ? undefined : v)),

    answers: z.record(z.string(), jsonValue).optional(),
  }),
});
// ─────────────────────────────────────────────
// UPDATE APPLICATION STATUS  (PATCH /org/applications/:id/status)
// ─────────────────────────────────────────────

export const updateApplicationStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
  body: z.object({
    // Org can set these statuses — PENDING and WITHDRAWN are user-only
    status: z.enum(
      ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED'],
      { error: 'Invalid status value' },
    ),
    // Internal org notes — stored on the application, not visible to user
    notes: z.string().trim().max(2000, 'Notes must be at most 2000 characters').optional(),
  }),
});

// ─────────────────────────────────────────────
// LIST USER APPLICATIONS  (GET /applications)
// ─────────────────────────────────────────────

export const listUserApplicationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum([
        'PENDING',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'OFFERED',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
      ])
      .optional(),
    sortBy: z.enum(['appliedAt', 'updatedAt']).default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ─────────────────────────────────────────────
// LIST ORG APPLICATIONS (GET /org/applications  +  GET /org/jobs/:jobId/applications)
// ─────────────────────────────────────────────

export const listOrgApplicationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum([
        'PENDING',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'OFFERED',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
      ])
      .optional(),
    jobId: z.string().uuid().optional(),
    sortBy: z.enum(['appliedAt', 'updatedAt']).default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const listJobApplicationsSchema = z.object({
  params: z.object({
    jobId: z.string().uuid('Invalid job ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum([
        'PENDING',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'OFFERED',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
      ])
      .optional(),
    sortBy: z.enum(['appliedAt', 'updatedAt']).default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ─────────────────────────────────────────────
// PARAM SCHEMAS
// ─────────────────────────────────────────────

export const applicationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
});

export const jobIdParamForSaveSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID'),
  }),
});

export const applicationAnswersSchema = z.record(z.string(), z.unknown());
// ─────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>['body'];
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>['body'];
export type ListUserApplicationsQuery = z.infer<typeof listUserApplicationsSchema>['query'];
export type ListOrgApplicationsQuery = z.infer<typeof listOrgApplicationsSchema>['query'];
export type ListJobApplicationsQuery = z.infer<typeof listJobApplicationsSchema>['query'];

export type ApplicationAnswersInput = z.infer<typeof applicationAnswersSchema>;
