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

// ─────────────────────────────────────────────
// ADMIN — SUBSCRIPTION MANAGEMENT
// ─────────────────────────────────────────────

export const subscriptionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subscription ID'),
  }),
});

export const adminListSubscriptionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE']).optional(),
  }),
});

export const adminRefundSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subscription ID'),
  }),
  body: z.object({
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  }),
});

// ─────────────────────────────────────────────
// USER — SUBSCRIPTION
// ─────────────────────────────────────────────

export const checkoutSchema = z.object({
  body: z.object({
    plan: z.enum(['BASIC', 'PREMIUM'], {
      message: 'Plan must be BASIC or PREMIUM',
    }),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type CreatePlanInput = z.infer<typeof createPlanSchema>['body'];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>['body'];
export type CheckoutInput = z.infer<typeof checkoutSchema>['body'];
export type AdminListSubscriptionsQuery = z.infer<typeof adminListSubscriptionsSchema>['query'];
