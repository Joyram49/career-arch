import { z } from 'zod';

export const orgJobsPerformanceQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(5),
  }),
});

export type OrgJobsPerformanceQuery = z.infer<typeof orgJobsPerformanceQuerySchema>['query'];
