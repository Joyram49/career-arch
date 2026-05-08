import { z } from 'zod';

export const adminListOrgSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    // Keyword search — email, companyName, location, country
    search: z.string().trim().optional(),
    // Location filter — matches profile.location OR profile.country
    // e.g. ?location=Dhaka or ?location=Bangladesh
    location: z.string().trim().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isEmailVerified: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isApproved: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isPaymentMethodOnFile: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    hasUnpaidIncentives: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['createdAt', 'email', 'lastLoginAt', 'foundedYear']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type AdminListOrgQuery = z.infer<typeof adminListOrgSchema>['query'];
