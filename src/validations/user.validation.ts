import { z } from 'zod';

import { changePasswordSchema } from './auth.validation';

// ── Update Profile ─────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  body: z
    .object({
      firstName: z
        .string()
        .trim()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be at most 50 characters')
        .optional(),
      lastName: z
        .string()
        .trim()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be at most 50 characters')
        .optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format')
        .optional()
        .or(z.literal('')),
      headline: z
        .string()
        .trim()
        .max(120, 'Headline must be at most 120 characters')
        .optional()
        .or(z.literal('')),
      summary: z
        .string()
        .trim()
        .max(2000, 'Summary must be at most 2000 characters')
        .optional()
        .or(z.literal('')),
      location: z
        .string()
        .trim()
        .max(100, 'Location must be at most 100 characters')
        .optional()
        .or(z.literal('')),
      linkedinUrl: z
        .string()
        .trim()
        .url('Invalid LinkedIn URL')
        .regex(/linkedin\.com/, 'Must be a LinkedIn URL')
        .optional()
        .or(z.literal('')),
      githubUrl: z
        .string()
        .trim()
        .url('Invalid GitHub URL')
        .regex(/github\.com/, 'Must be a GitHub URL')
        .optional()
        .or(z.literal('')),
      portfolioUrl: z.string().trim().url('Invalid portfolio URL').optional().or(z.literal('')),
      skills: z
        .array(z.string().trim().min(1).max(50))
        .max(30, 'You can add at most 30 skills')
        .optional(),
      experienceYears: z
        .number()
        .int('Experience years must be a whole number')
        .min(0, 'Experience years cannot be negative')
        .max(50, 'Experience years cannot exceed 50')
        .optional(),
    })
    .strict(),
});

// ── Deactivate Account ─────────────────────────────────────────────────────
export const deactivateAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required to deactivate your account'),
  }),
});

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

// ── Re-export change password (used in user router) ───────────────────────
export { changePasswordSchema };

// ── Inferred types ─────────────────────────────────────────────────────────
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>['body'];
export type AdminListUsersQuery = z.infer<typeof adminListUsersSchema>['query'];
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>['body'];
