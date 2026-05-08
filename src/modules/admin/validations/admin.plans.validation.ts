import { z } from 'zod';

// ── Plan features schema (reused in create + update) ──────────────────────
export const planFeaturesSchema = z.object({
  jobBrowseLimit: z.number().int().min(-1),
  applyMonthlyLimit: z.number().int().min(-1),
  saveJobsLimit: z.number().int().min(-1),
  canViewOrgProfile: z.boolean(),
  resumeVersions: z.number().int().min(-1),
  canDownloadHistory: z.boolean(),
  earlyJobAlerts: z.boolean(),
  prioritySearch: z.boolean(),
  aiResumeTips: z.boolean(),
  badge: z.enum(['basic', 'premium']).nullable(),
});

// ─────────────────────────────────────────────
// ADMIN — PLAN CATALOGUE
// ─────────────────────────────────────────────

export const createPlanSchema = z.object({
  body: z.object({
    key: z.enum(['BASIC', 'PREMIUM']), // FREE is immutable — admin cannot create it
    displayName: z.string().trim().min(1).max(50),
    description: z.string().trim().max(300).optional(),
    monthlyPriceCents: z.number().int().min(1, 'Price must be at least 1 cent'),
    features: planFeaturesSchema,
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid plan ID'),
  }),
  body: z.object({
    displayName: z.string().trim().min(1).max(50).optional(),
    description: z.string().trim().max(300).nullable().optional(),
    monthlyPriceCents: z.number().int().min(0).optional(),
    features: planFeaturesSchema.partial().optional(),
  }),
});

export const planIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid plan ID'),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type CreatePlanInput = z.infer<typeof createPlanSchema>['body'];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>['body'];
