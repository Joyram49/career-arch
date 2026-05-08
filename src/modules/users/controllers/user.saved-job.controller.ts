import * as SavedJobService from '@modules/users/services/user.saved-job.service';
import { sendCreated, sendSuccess } from '@shared/utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── POST /jobs/:id/save ────────────────────────────────────────────────────
export async function saveJob(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id: jobId } = req.params as { id: string };

  const result = await SavedJobService.saveJob(sub, jobId);
  return sendCreated(res, null, result.message);
}

// ── DELETE /jobs/:id/save ──────────────────────────────────────────────────
export async function unsaveJob(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id: jobId } = req.params as { id: string };

  const result = await SavedJobService.unsaveJob(sub, jobId);
  return sendSuccess(res, null, result.message);
}

// ── GET /user/saved-jobs ───────────────────────────────────────────────────
export async function listSavedJobs(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  const page = Number(req.query['page'] ?? 1);
  const limit = Number(req.query['limit'] ?? 20);
  const sortOrder = (req.query['sortOrder'] as 'asc' | 'desc' | undefined) ?? 'desc';

  const { data: savedJobs, meta } = await SavedJobService.listSavedJobs(sub, {
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100),
    sortOrder,
  });

  return sendSuccess(res, { savedJobs }, 'Saved jobs retrieved', 200, meta as never);
}
