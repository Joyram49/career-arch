import * as JobService from '@services/jobs/job.service';
import { sendCreated, sendSuccess } from '@utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type {
  CreateJobInput,
  ListDeletedJobsQuery,
  ListOrgJobsQuery,
  UpdateJobInput,
} from '@validations/jobs.validation';
import type { Request, Response } from 'express';

// ── Create Job ─────────────────────────────────────────────────────────────
export async function createJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const data = req.body as CreateJobInput;

  const job = await JobService.createJob(orgId, data);

  return sendCreated(res, { job }, 'Job created successfully');
}

// ── Get Single Job (org view) ──────────────────────────────────────────────
export async function getJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const job = await JobService.getOrgJob(orgId, id);

  return sendSuccess(res, { job }, 'Job retrieved successfully');
}

// ── List Own Jobs ──────────────────────────────────────────────────────────
export async function listJobs(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const query = req.query as unknown as ListOrgJobsQuery;

  const { data: jobs, meta } = await JobService.listOrgJobs(orgId, query);

  return sendSuccess(res, { jobs }, 'Jobs retrieved successfully', 200, meta);
}

// ── Update Job ─────────────────────────────────────────────────────────────
export async function updateJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const data = req.body as UpdateJobInput;

  const job = await JobService.updateJob(orgId, id, data);

  return sendSuccess(res, { job }, 'Job updated successfully');
}

// ── Publish Job ────────────────────────────────────────────────────────────
export async function publishJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const job = await JobService.publishJob(orgId, id);

  return sendSuccess(res, { job }, 'Job published successfully');
}

// ── Close Job ──────────────────────────────────────────────────────────────
export async function closeJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const job = await JobService.closeJob(orgId, id);

  return sendSuccess(res, { job }, 'Job closed successfully');
}

// ── Soft Delete Job ────────────────────────────────────────────────────────
export async function deleteJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  await JobService.softDeleteJob(orgId, id);

  return sendSuccess(res, null, `Job moved to trash. It will be permanently deleted in 30 days.`);
}

// ── Restore Job from Trash ─────────────────────────────────────────────────
export async function restoreJob(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const job = await JobService.restoreJob(orgId, id);

  return sendSuccess(res, { job }, 'Job restored successfully');
}

// ── List Deleted Jobs (trash view) ─────────────────────────────────────────
export async function listDeletedJobs(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const query = req.query as unknown as ListDeletedJobsQuery;

  const { data: deletedJobs, meta } = await JobService.listDeletedJobs(orgId, query);

  return sendSuccess(res, { deletedJobs }, 'Deleted jobs retrieved successfully', 200, meta);
}
