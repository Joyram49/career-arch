import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    plan: z.enum(['BASIC', 'PREMIUM'], {
      message: 'Plan must be BASIC or PREMIUM',
    }),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type CheckoutInput = z.infer<typeof checkoutSchema>['body'];
