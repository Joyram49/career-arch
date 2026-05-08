import * as ApplicationService from '@modules/applications/services/application.service';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type {
  ListJobApplicationsQuery,
  ListOrgApplicationsQuery,
  UpdateApplicationStatusInput,
} from '@modules/applications/validations/application.validation';
import type { Request, Response } from 'express';

// ── GET /org/applications ──────────────────────────────────────────────────
export async function listAllApplications(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const query = req.query as unknown as ListOrgApplicationsQuery;

  const { data: applications, meta } = await ApplicationService.listOrgApplications(sub, query);
  return sendSuccess(res, { applications }, 'Applications retrieved', 200, meta as never);
}

// ── GET /org/applications/:id ─────────────────────────────────────────────
export async function getApplicationDetail(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const application = await ApplicationService.getOrgApplication(sub, id);
  return sendSuccess(res, { application }, 'Application retrieved');
}

// ── PATCH /org/applications/:id/status ────────────────────────────────────
export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const body = req.body as UpdateApplicationStatusInput;

  const application = await ApplicationService.updateApplicationStatus(sub, id, body);
  return sendSuccess(res, { application }, `Application status updated to ${body.status}`);
}

// ── GET /org/jobs/:jobId/applications ─────────────────────────────────────
export async function listApplicationsForJob(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { jobId } = req.params as { jobId: string };
  const query = req.query as unknown as ListJobApplicationsQuery;

  const { data: applications, meta } = await ApplicationService.listJobApplications(
    sub,
    jobId,
    query,
  );
  return sendSuccess(res, { applications }, 'Applications retrieved', 200, meta as never);
}
