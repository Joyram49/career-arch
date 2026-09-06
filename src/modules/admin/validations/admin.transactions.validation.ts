import z from 'zod';

// ── Admin: List Transactions Query ─────────────────────────────────────────
export const adminListTransactionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    // Keyword search — user name/email, org companyName/email, payment description
    search: z.string().trim().optional(),
    type: z.enum(['SUBSCRIPTION', 'REFUND', 'INCENTIVE', 'OTHER']).optional(),
    status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED']).optional(),
    sortBy: z.enum(['createdAt', 'amount']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID'),
  }),
});

export type AdminListTransactionsQuery = z.infer<typeof adminListTransactionsSchema>['query'];

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>['params'];
