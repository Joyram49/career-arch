import { z } from 'zod';

// ── Admin: List Users Query ────────────────────────────────────────────────
export const adminListUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isEmailVerified: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM']).optional(),
    sortBy: z.enum(['createdAt', 'email', 'lastLoginAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ── Admin: User ID param ───────────────────────────────────────────────────
export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// ── Admin: Suspend / Activate ──────────────────────────────────────────────
export const adminUpdateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must be at most 500 characters')
      .optional(),
  }),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersSchema>['query'];
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>['body'];
export type AdminUserParamQuery = z.infer<typeof userIdParamSchema>['params'];
