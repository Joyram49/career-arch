import * as ApplicationService from '@modules/applications/services/application.service';
import { sendCreated, sendSuccess } from '@shared/utils/apiResponse';
import { getParsedQuery } from '@shared/utils/requestQuery';

import type { IAuthenticatedRequest } from '@app-types/index';
import type {
  CreateApplicationInput,
  ListUserApplicationsQuery,
} from '@modules/applications/validations/application.validation';
import type { Request, Response } from 'express';

// ── POST /applications ─────────────────────────────────────────────────────
export async function applyToJob(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const body = req.body as CreateApplicationInput;

  const application = await ApplicationService.createApplication(sub, body);
  return sendCreated(res, { application }, 'Application submitted successfully');
}

// ── GET /applications ──────────────────────────────────────────────────────
export async function listMyApplications(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const query = getParsedQuery<ListUserApplicationsQuery>(req);

  const { data: applications, meta } = await ApplicationService.listUserApplications(sub, query);
  return sendSuccess(res, { applications }, 'Applications retrieved', 200, meta as never);
}

// ── GET /applications/:id ──────────────────────────────────────────────────
export async function getMyApplication(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const application = await ApplicationService.getUserApplication(sub, id);
  return sendSuccess(res, { application }, 'Application retrieved');
}

// ── DELETE /applications/:id  (withdraw) ──────────────────────────────────
export async function withdrawMyApplication(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const result = await ApplicationService.withdrawApplication(sub, id);
  return sendSuccess(res, null, result.message);
}
