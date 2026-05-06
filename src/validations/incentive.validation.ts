import { z } from 'zod';

// ── Common param ───────────────────────────────────────────────────────────

export const incentiveIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid incentive ID'),
  }),
});

// ── Org — list own incentives ──────────────────────────────────────────────

export const listOrgIncentivesSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'PAID', 'WAIVED', 'DISPUTED', 'OVERDUE']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'dueAt', 'paidAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ── Org — dispute incentive ────────────────────────────────────────────────

export const disputeIncentiveSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid incentive ID'),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(20, 'Please provide a detailed reason (minimum 20 characters)')
      .max(500, 'Reason must be at most 500 characters'),
  }),
});

// ── Admin — list all incentives ────────────────────────────────────────────

export const adminListIncentivesSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'PAID', 'WAIVED', 'DISPUTED', 'OVERDUE']).optional(),
    orgId: z.string().uuid('Invalid organization ID').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'dueAt', 'paidAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ── Admin — waive incentive ────────────────────────────────────────────────

export const waiveIncentiveSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid incentive ID'),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must be at most 500 characters'),
  }),
});

// ── Admin — resolve dispute ────────────────────────────────────────────────

export const resolveDisputeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid incentive ID'),
  }),
  body: z.object({
    resolution: z.enum(['collect', 'waive'], {
      error: 'Resolution must be "collect" or "waive"',
    }),
    note: z.string().trim().max(500).optional(),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type ListOrgIncentivesQuery = z.infer<typeof listOrgIncentivesSchema>['query'];
export type DisputeIncentiveInput = z.infer<typeof disputeIncentiveSchema>['body'];
export type AdminListIncentivesQuery = z.infer<typeof adminListIncentivesSchema>['query'];
export type WaiveIncentiveInput = z.infer<typeof waiveIncentiveSchema>['body'];
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>['body'];
