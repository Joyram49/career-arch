import * as AdminJobsService from '@modules/admin/services/admin.jobs.service';
import {
  adminListJobsSchema,
  type TakedownJobInput,
} from '@modules/admin/validations/admin.jobs.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { Request, Response } from 'express';

// ── GET /admin/jobs ────────────────────────────────────────────────────────

export async function listJobs(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListJobsSchema.shape.query).build();

  const { data, meta } = await AdminJobsService.listAllJobs(query);

  return sendSuccess(res, { jobs: data }, 'Jobs retrieved', 200, meta);
}

// ── PATCH /admin/jobs/:id/takedown ─────────────────────────────────────────

export async function takedownJob(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const { reason } = req.body as TakedownJobInput;

  const result = await AdminJobsService.takedownJob(id, reason);

  return sendSuccess(res, null, result.message);
}
