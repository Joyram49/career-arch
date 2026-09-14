import * as OrgStatsService from '@modules/organizations/services/org.stats.service';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { OrgJobsPerformanceQuery } from '@modules/organizations/validations/org.stats.validation';
import type { Request, Response } from 'express';

// ── GET /org/dashboard/stats ────────────────────────────────────────────
export async function getDashboardStats(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const stats = await OrgStatsService.getOrgDashboardStats(sub);
  return sendSuccess(res, { stats }, 'Dashboard stats retrieved');
}

// ── GET /org/dashboard/jobs-performance ─────────────────────────────────
export async function getJobsPerformance(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { page, limit } = req.query as unknown as OrgJobsPerformanceQuery;
  // still arrive as raw strings. Parse them directly instead
  const formattedPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const formattedLimit = Number.isInteger(limit) && limit >= 1 ? Math.min(limit, 50) : 5;

  const result = await OrgStatsService.getOrgJobsPerformance(sub, formattedPage, formattedLimit);
  return sendSuccess(res, result, 'Job performance retrieved');
}

// ── GET /org/dashboard/recent-applications ──────────────────────────────
export async function getRecentApplications(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const rawLimit = Number(req.query['limit']);
  const limit = Number.isFinite(rawLimit) ? Math.min(20, Math.max(1, rawLimit)) : 5;

  const applicants = await OrgStatsService.getOrgRecentApplications(sub, limit);
  return sendSuccess(res, { applicants }, 'Recent applications retrieved');
}
