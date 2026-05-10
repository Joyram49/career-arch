import * as PublicJobService from '@modules/jobs/services/public.job.service';
import { sendSuccess } from '@shared/utils/apiResponse';
import { getParsedQuery } from '@shared/utils/requestQuery';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { PublicJobSearchQuery } from '@modules/jobs/validations/public.jobs.validation';
import type { Request, Response } from 'express';

// ── GET /jobs ──────────────────────────────────────────────────────────────
export async function searchJobs(req: Request, res: Response): Promise<Response> {
  // optionalAuthenticate attaches user if token present — null if guest
  const user = (req as Partial<IAuthenticatedRequest>).user ?? null;
  const query = getParsedQuery<PublicJobSearchQuery>(req);

  const { data: jobs, meta } = await PublicJobService.searchPublicJobs(user, query);
  return sendSuccess(res, { jobs }, 'Jobs retrieved', 200, meta as never);
}

// ── GET /jobs/categories ───────────────────────────────────────────────────
export async function getCategories(_req: Request, res: Response): Promise<Response> {
  const categories = await PublicJobService.getJobCategories();
  return sendSuccess(res, { categories }, 'Categories retrieved');
}

// ── GET /jobs/:slug ────────────────────────────────────────────────────────
export async function getJobBySlug(req: Request, res: Response): Promise<Response> {
  const { slug } = req.params as { slug: string };
  // optionalAuthenticate — pass userId only if authenticated
  const userId = (req as Partial<IAuthenticatedRequest>).user?.sub;

  const job = await PublicJobService.getPublicJobBySlug(slug, userId);
  return sendSuccess(res, { job }, 'Job retrieved');
}
