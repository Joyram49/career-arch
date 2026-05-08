import { z } from 'zod';

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

export type AdminListSubscriptionsQuery = z.infer<typeof adminListSubscriptionsSchema>['query'];
