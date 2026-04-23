// ── Reusable helpers ───────────────────────────────────────────────────────

import z from 'zod';

const urlSchema = z
  .url('Must be a valid URL')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));

// ─────────────────────────────────────────────
// ORG PROFILE
// ─────────────────────────────────────────────

export const updateOrgProfileSchema = z.object({
  body: z.object({
    companyName: z
      .string()
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must be at most 100 characters')
      .optional(),
    website: urlSchema,
    industry: z
      .enum([
        'Technology',
        'Finance',
        'Healthcare',
        'Education',
        'E-Commerce',
        'Manufacturing',
        'Media & Entertainment',
        'Consulting',
        'Real Estate',
        'Transportation',
        'Energy',
        'Retail',
        'Telecommunications',
        'Government',
        'Non-Profit',
        'Other',
      ])
      .optional(),
    companySize: z
      .enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'])
      .optional(),
    foundedYear: z
      .number()
      .int()
      .min(1800, 'Founded year seems too far back')
      .max(new Date().getFullYear(), 'Founded year cannot be in the future')
      .optional(),
    description: z
      .string()
      .trim()
      .min(50, 'Description must be at least 50 characters')
      .max(2000, 'Description must be at most 2000 characters')
      .optional(),
    location: optionalString,
    country: optionalString,
    linkedinUrl: urlSchema,
    twitterUrl: urlSchema,
  }),
});

// ─────────────────────────────────────────────
// ORG BILLING
// ─────────────────────────────────────────────

/**
 * Used when the frontend confirms a Stripe SetupIntent.
 * The actual payment method is attached to the Stripe Customer by the
 * frontend Stripe.js SDK — we only receive the paymentMethodId to save.
 */
export const savePaymentMethodSchema = z.object({
  body: z.object({
    paymentMethodId: z
      .string()
      .min(1, 'Payment method ID is required')
      .startsWith('pm_', 'Invalid payment method ID format'),
  }),
});

// ── Inferred Types ─────────────────────────────────────────────────────────
export type UpdateOrgProfileInput = z.infer<typeof updateOrgProfileSchema>['body'];
export type SavePaymentMethodInput = z.infer<typeof savePaymentMethodSchema>['body'];
