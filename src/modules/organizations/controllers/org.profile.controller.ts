import * as OrgProfileService from '@modules/organizations/services/org.profile.service';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { UpdateOrgProfileInput } from '@modules/organizations/validations/org.validation';
import type { Request, Response } from 'express';

// ── GET /org/profile ───────────────────────────────────────────────────────
export async function getProfile(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const profile = await OrgProfileService.getOrgProfile(sub);
  return sendSuccess(res, { profile }, 'Organization profile retrieved');
}

// ── PUT /org/profile ───────────────────────────────────────────────────────
export async function updateProfile(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const body = req.body as UpdateOrgProfileInput;
  const profile = await OrgProfileService.updateOrgProfile(sub, body);
  return sendSuccess(res, { profile }, 'Organization profile updated successfully');
}

// ── POST /org/profile/logo ───────────────────────────────────────────────────────

export async function uploadLogo(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  if (req.file === undefined) {
    return sendSuccess(res, null, 'No file uploaded', 400);
  }

  const result = await OrgProfileService.uploadOrgLogo(sub, req.file);
  return sendSuccess(res, result, 'Logo uploaded successfully');
}
